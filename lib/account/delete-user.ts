import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  accountDeletions,
  activityLogs,
  answers,
  contacts,
  experiences,
  invitations,
  passwordResetTokens,
  questions,
  teamMembers,
  teams,
  users,
} from '@/lib/db/schema';
import { hashEmailForBlocklist } from './email-hash';

// ユーザー削除（本人退会・運営削除）の共通処理。
// 仕様は docs/account-deletion.md を参照。
//
// - users の行は物理削除せず、個人情報を消した「墓標」にする。
// - mode 'full'（完全削除）は、コンテンツを非表示にし、PURGE_DAYS 日後にパージする（パージは別ジョブ）。
// - mode 'keep_content'（コンテンツを残す）は運営のみ。コンテンツは残す。

export const PURGE_DAYS = 30;

export type DeleteUserMode = 'full' | 'keep_content';

export type DeleteUserActor = { type: 'self' } | { type: 'admin'; id: number };

export type DeleteUserParams = {
  userId: number;
  mode: DeleteUserMode;
  actor: DeleteUserActor;
  // 運営削除の理由（運営削除では必須）
  reason?: string;
  // 運営削除で、同じメールアドレスでの再登録を拒否する
  blockReRegistration?: boolean;
};

export type DeleteUserErrorCode =
  | 'invalid_request'
  | 'forbidden'
  | 'not_found'
  | 'already_deleted'
  | 'is_owner'
  | 'team_owner_has_members'
  | 'billing_attached';

export type DeleteUserResult =
  | { ok: true; deletionId: number; purgeAfter: Date }
  | { ok: false; code: DeleteUserErrorCode; message: string };

type Database = typeof db;
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

function fail(code: DeleteUserErrorCode, message: string): DeleteUserResult {
  return { ok: false, code, message };
}

/**
 * ユーザーを削除する。すべて1トランザクションで行い、途中で失敗したら何も変わらない。
 * 実行できない条件（ガード）に当たった場合は、例外ではなく { ok: false } を返す。
 */
export async function deleteUser(
  params: DeleteUserParams
): Promise<DeleteUserResult> {
  return db.transaction((tx) => deleteUserInTransaction(tx, params));
}

/**
 * deleteUser の本体。呼び出し側のトランザクションの中で実行する
 * （テストで、実行後にロールバックするために分けてある）。
 */
export async function deleteUserInTransaction(
  tx: Tx,
  params: DeleteUserParams
): Promise<DeleteUserResult> {
  const { userId, mode, actor } = params;
  const reason = params.reason?.trim() || null;

  // --- リクエストの検証 ---
  if (!Number.isInteger(userId) || userId <= 0) {
    return fail('invalid_request', '対象のユーザーが正しくありません。');
  }

  if (actor.type === 'self') {
    if (mode !== 'full') {
      return fail(
        'invalid_request',
        '本人による削除は、完全削除のみ行えます。'
      );
    }
    if (params.blockReRegistration) {
      return fail(
        'invalid_request',
        '再登録の拒否は、運営による削除でのみ指定できます。'
      );
    }
  } else {
    if (actor.id === userId) {
      return fail('invalid_request', '自分自身は、運営として削除できません。');
    }
    if (!reason) {
      return fail('invalid_request', '運営による削除には、理由が必要です。');
    }

    const [admin] = await tx
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, actor.id), isNull(users.deletedAt)))
      .limit(1);

    if (admin?.role !== 'owner') {
      return fail('forbidden', 'ユーザーを削除する権限がありません。');
    }
  }

  // --- 対象ユーザーの確認（行をロックして、同時実行による二重削除を防ぐ） ---
  const [target] = await tx
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .for('update')
    .limit(1);

  if (!target) {
    return fail('not_found', 'ユーザーが見つかりません。');
  }

  if (target.deletedAt) {
    return fail('already_deleted', 'このユーザーはすでに削除されています。');
  }

  // 運営（ownerロール）は、この経路では削除できない。先に降格する手順を踏む
  if (target.role === 'owner') {
    return fail(
      'is_owner',
      '運営アカウントは削除できません。先にロールを変更してください。'
    );
  }

  // --- チームのガード ---
  const memberships = await tx
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  const emptiedTeamIds: number[] = [];

  for (const membership of memberships) {
    const [{ others }] = await tx
      .select({ others: sql<number>`count(*)::int` })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, membership.teamId),
          ne(teamMembers.userId, userId)
        )
      );

    if (others > 0) {
      if (membership.role === 'owner') {
        return fail(
          'team_owner_has_members',
          '他のメンバーがいるチームのオーナーは削除できません。先に権限を譲渡してください。'
        );
      }
      continue;
    }

    // このユーザーが最後の1人になるチーム。課金情報が残っていれば手動対応が必要
    const [team] = await tx
      .select({
        stripeCustomerId: teams.stripeCustomerId,
        stripeSubscriptionId: teams.stripeSubscriptionId,
      })
      .from(teams)
      .where(eq(teams.id, membership.teamId))
      .limit(1);

    if (team?.stripeCustomerId || team?.stripeSubscriptionId) {
      return fail(
        'billing_attached',
        '課金情報が残っているチームのため、削除できません。先に解約と顧客情報の整理を行ってください。'
      );
    }

    emptiedTeamIds.push(membership.teamId);
  }

  // --- ここから書き込み ---
  const now = new Date();
  const purgeAfter = new Date(now.getTime() + PURGE_DAYS * 24 * 60 * 60 * 1000);

  // 1. 削除の記録
  const [deletion] = await tx
    .insert(accountDeletions)
    .values({
      userId,
      mode,
      actorType: actor.type,
      actorId: actor.type === 'admin' ? actor.id : null,
      reason,
      emailHash:
        actor.type === 'admin' && params.blockReRegistration
          ? hashEmailForBlocklist(target.email)
          : null,
      purgeAfter,
    })
    .returning({ id: accountDeletions.id });

  // 2. パスワード再設定トークン
  await tx
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  // 3. 招待。本人のメールアドレス宛ての招待は、どちらのモードでも削除する
  const addressedToUser = sql`lower(${invitations.email}) = ${target.email.toLowerCase()}`;

  if (mode === 'full') {
    await tx
      .delete(invitations)
      .where(or(eq(invitations.invitedBy, userId), addressedToUser));
  } else {
    await tx.delete(invitations).where(addressedToUser);
    await tx
      .update(invitations)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(invitations.invitedBy, userId),
          eq(invitations.status, 'pending')
        )
      );
  }

  // 4. お問い合わせ。氏名・メールを匿名化する。本文は30日後（保持期間）に削除する。
  //    updated_at は保持期間の基準なので、触らない
  await tx
    .update(contacts)
    .set({ name: null, email: 'deleted@deleted.invalid' })
    .where(eq(contacts.userId, userId));

  // 5. アクセス履歴。誰のものか分からなくし、IPアドレスを消す（日時と操作種別は残す）
  await tx
    .update(activityLogs)
    .set({ userId: null, ipAddress: null })
    .where(eq(activityLogs.userId, userId));

  // 6. チーム。所属を外し、誰もいなくなったチームは名前（メールを含む）を匿名化して残す
  await tx.delete(teamMembers).where(eq(teamMembers.userId, userId));

  for (const teamId of emptiedTeamIds) {
    await tx
      .update(teams)
      .set({ name: `deleted-team-${teamId}`, updatedAt: now })
      .where(eq(teams.id, teamId));
  }

  // 7. コンテンツ（完全削除のみ）。非表示にして、30日後にパージする
  if (mode === 'full') {
    await tx
      .update(questions)
      .set({ deletedAt: now })
      .where(and(eq(questions.authorId, userId), isNull(questions.deletedAt)));

    await tx
      .update(answers)
      .set({ deletedAt: now })
      .where(and(eq(answers.authorId, userId), isNull(answers.deletedAt)));

    await tx
      .update(experiences)
      .set({ deletedAt: now })
      .where(
        and(eq(experiences.authorId, userId), isNull(experiences.deletedAt))
      );
  }

  // 8. ユーザーを墓標にする。パスワードは、誰も知らないランダムな値のハッシュにする
  const unusablePasswordHash = await hash(randomBytes(32).toString('hex'), 10);

  await tx
    .update(users)
    .set({
      name: null,
      email: `deleted-${userId}@deleted.invalid`,
      passwordHash: unusablePasswordHash,
      role: 'member',
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  return { ok: true, deletionId: deletion.id, purgeAfter };
}
