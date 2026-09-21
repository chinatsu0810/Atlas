// ユーザー削除（deleteUser）と、30日後のパージ（purgeAccountDeletion）の動作確認スクリプト。
//   npx tsx lib/account/verify-account-deletion.ts
//
// テストデータの作成から検証まで、すべて1つのトランザクションの中で行い、最後に必ずロールバックする。
// そのため、接続先のDBに行は残らない（ただし serial の採番は進む）。
// 仕様は docs/account-deletion.md を参照。

import { compare, hash } from 'bcryptjs';
import { and, eq, isNull, like } from 'drizzle-orm';

import { client, db } from '@/lib/db/drizzle';
import {
  accountDeletions,
  activityLogs,
  answers,
  contactStatusHistory,
  contacts,
  experienceTags,
  experiences,
  invitations,
  passwordResetTokens,
  questionTags,
  questions,
  tags,
  teamMembers,
  teams,
  users,
} from '@/lib/db/schema';
import {
  dueDeletionCondition,
  purgeAccountDeletionInTransaction,
} from '@/lib/retention/account-deletions';
import { hashEmailForBlocklist } from './email-hash';
import {
  PURGE_DAYS,
  deleteUserInTransaction,
  type DeleteUserParams,
  type Tx,
} from './delete-user';

class Rollback extends Error {}

let failures = 0;
let checks = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(
      `  NG: ${name}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`
    );
  }
}

async function inRollback(name: string, fn: (tx: Tx) => Promise<void>) {
  console.log(`- ${name}`);
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      throw error;
    }
  }
}

const RUN = Math.random().toString(36).slice(2, 8);
let seq = 0;
const PASSWORD = 'OriginalPassword123';
const passwordHash = { value: '' };

async function createUser(
  tx: Tx,
  label: string,
  role: 'member' | 'owner' = 'member'
) {
  seq += 1;
  const [user] = await tx
    .insert(users)
    .values({
      name: `verify-${RUN}-${label}-${seq}`,
      email: `verify-${RUN}-${label}-${seq}@example.invalid`,
      passwordHash: passwordHash.value,
      role,
    })
    .returning();
  return user;
}

async function createTeam(tx: Tx, label: string) {
  const [team] = await tx
    .insert(teams)
    .values({ name: `verify-${RUN}-${label}'s Team` })
    .returning();
  return team;
}

async function join(tx: Tx, userId: number, teamId: number, role: string) {
  await tx.insert(teamMembers).values({ userId, teamId, role });
}

// 削除対象のユーザーと、その周辺のデータ一式を作る
async function seedTarget(tx: Tx, ownerId: number) {
  const target = await createUser(tx, 'target');
  const other = await createUser(tx, 'other');
  const team = await createTeam(tx, 'target');
  const otherTeam = await createTeam(tx, 'other');
  await join(tx, target.id, team.id, 'owner');
  await join(tx, other.id, otherTeam.id, 'owner');

  await tx.insert(activityLogs).values([
    { teamId: team.id, userId: target.id, action: 'SIGN_IN', ipAddress: '203.0.113.1' },
    { teamId: otherTeam.id, userId: other.id, action: 'SIGN_IN', ipAddress: '203.0.113.2' },
  ]);

  const [question] = await tx
    .insert(questions)
    .values({ title: 'q', content: 'q', country: 'JP', authorId: target.id })
    .returning();
  const [answerByOther] = await tx
    .insert(answers)
    .values({ questionId: question.id, content: 'a', authorId: other.id })
    .returning();
  const [otherQuestion] = await tx
    .insert(questions)
    .values({ title: 'oq', content: 'oq', country: 'JP', authorId: other.id })
    .returning();
  const [answerByTarget] = await tx
    .insert(answers)
    .values({ questionId: otherQuestion.id, content: 'a2', authorId: target.id })
    .returning();
  const [experience] = await tx
    .insert(experiences)
    .values({ title: 'e', content: 'e', country: 'JP', authorId: target.id })
    .returning();

  // 他人の質問への、他人の回答（パージで巻き込まれてはいけない）
  const [otherAnswer] = await tx
    .insert(answers)
    .values({ questionId: otherQuestion.id, content: 'a3', authorId: other.id })
    .returning();

  // タグ。本人の質問・経験談と、他人の質問に付ける
  const [tag] = await tx
    .insert(tags)
    .values({ name: `verify-${RUN}-${seq}`, slug: `verify-${RUN}-${seq}` })
    .returning();
  await tx.insert(questionTags).values([
    { questionId: question.id, tagId: tag.id },
    { questionId: otherQuestion.id, tagId: tag.id },
  ]);
  await tx.insert(experienceTags).values({ experienceId: experience.id, tagId: tag.id });

  const contactUpdatedAt = new Date('2026-01-01T00:00:00Z');
  const [contact] = await tx
    .insert(contacts)
    .values({
      userId: target.id,
      name: 'Target Name',
      email: target.email,
      category: 'general',
      message: 'hello',
      status: 'resolved',
      updatedAt: contactUpdatedAt,
    })
    .returning();
  await tx.insert(contactStatusHistory).values({
    contactId: contact.id,
    oldStatus: 'unread',
    newStatus: 'resolved',
    changedBy: ownerId,
  });
  const [otherContact] = await tx
    .insert(contacts)
    .values({
      userId: other.id,
      name: 'Other Name',
      email: other.email,
      category: 'general',
      message: 'hi',
    })
    .returning();

  await tx.insert(passwordResetTokens).values({
    userId: target.id,
    token: `verify-${RUN}-${seq}`,
    expiresAt: new Date(Date.now() + 3600_000),
  });

  // 本人が送った招待（pending / accepted）と、本人のメール宛ての招待
  await tx.insert(invitations).values([
    { teamId: team.id, email: `invitee-${RUN}@example.invalid`, role: 'member', invitedBy: target.id, status: 'pending' },
    { teamId: team.id, email: `invitee2-${RUN}@example.invalid`, role: 'member', invitedBy: target.id, status: 'accepted' },
    { teamId: otherTeam.id, email: target.email.toUpperCase(), role: 'member', invitedBy: other.id, status: 'accepted' },
    { teamId: otherTeam.id, email: `invitee3-${RUN}@example.invalid`, role: 'member', invitedBy: other.id, status: 'pending' },
  ]);

  return {
    target,
    other,
    team,
    otherTeam,
    question,
    answerByOther,
    otherQuestion,
    answerByTarget,
    otherAnswer,
    tag,
    experience,
    contact,
    otherContact,
    contactUpdatedAt,
  };
}

async function main() {
  passwordHash.value = await hash(PASSWORD, 4);

  // ---------------------------------------------------------------
  await inRollback('本人退会（完全削除）', async (tx) => {
    const owner = await createUser(tx, 'owner', 'owner');
    const s = await seedTarget(tx, owner.id);
    const before = Date.now();

    const result = await deleteUserInTransaction(tx, {
      userId: s.target.id,
      mode: 'full',
      actor: { type: 'self' },
    });
    check('成功する', result.ok, result);
    if (!result.ok) return;

    // users: 墓標
    const [u] = await tx.select().from(users).where(eq(users.id, s.target.id));
    check('name が NULL', u.name === null, u.name);
    check('email が墓標用', u.email === `deleted-${s.target.id}@deleted.invalid`, u.email);
    check('元のメールが残っていない', !u.email.includes(RUN));
    check('旧パスワードで認証できない', !(await compare(PASSWORD, u.passwordHash)));
    check('passwordHash が変わっている', u.passwordHash !== passwordHash.value);
    check('role が member', u.role === 'member');
    check('deletedAt が入っている', u.deletedAt !== null);

    // account_deletions
    const [d] = await tx
      .select()
      .from(accountDeletions)
      .where(eq(accountDeletions.id, result.deletionId));
    check('記録: mode / actorType', d.mode === 'full' && d.actorType === 'self', d);
    check('記録: actorId / reason / emailHash が空', d.actorId === null && d.reason === null && d.emailHash === null, d);
    check('記録: userId', d.userId === s.target.id);
    const days = (d.purgeAfter.getTime() - before) / 86_400_000;
    check(`記録: purgeAfter が約${PURGE_DAYS}日後`, days > PURGE_DAYS - 0.01 && days < PURGE_DAYS + 0.01, days);
    check('記録: purgedAt が空', d.purgedAt === null);

    // 関連データ
    check('トークンが消えている', (await tx.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, s.target.id))).length === 0);

    const invs = await tx.select().from(invitations);
    const mine = invs.filter((i) => i.teamId === s.team.id || i.teamId === s.otherTeam.id);
    check('本人が送った招待が消えている', !mine.some((i) => i.invitedBy === s.target.id));
    check('本人のメール宛ての招待が消えている（大文字小文字を区別しない）', !mine.some((i) => i.email.toLowerCase() === s.target.email.toLowerCase()));
    check('無関係の招待は残っている', mine.some((i) => i.email === `invitee3-${RUN}@example.invalid`));

    const [c] = await tx.select().from(contacts).where(eq(contacts.id, s.contact.id));
    check('お問い合わせ: name が NULL', c.name === null);
    check('お問い合わせ: email が匿名化', c.email === 'deleted@deleted.invalid', c.email);
    check('お問い合わせ: message と user_id が残っている', c.message === 'hello' && c.userId === s.target.id);
    check('お問い合わせ: updated_at が変わっていない', c.updatedAt.getTime() === s.contactUpdatedAt.getTime(), c.updatedAt);

    const logs = await tx.select().from(activityLogs).where(eq(activityLogs.teamId, s.team.id));
    check('アクセス履歴が残っている', logs.length === 1 && logs[0].action === 'SIGN_IN', logs);
    check('アクセス履歴: user_id と ip が NULL', logs[0].userId === null && logs[0].ipAddress === null, logs);

    check('team_members が消えている', (await tx.select().from(teamMembers).where(eq(teamMembers.userId, s.target.id))).length === 0);
    const [t] = await tx.select().from(teams).where(eq(teams.id, s.team.id));
    check('空になったチームの名前が匿名化', t.name === `deleted-team-${s.team.id}`, t.name);
    check('チームの行は残っている', !!t);

    const [q] = await tx.select().from(questions).where(eq(questions.id, s.question.id));
    const [a] = await tx.select().from(answers).where(eq(answers.id, s.answerByTarget.id));
    const [e] = await tx.select().from(experiences).where(eq(experiences.id, s.experience.id));
    check('質問が非表示', q.deletedAt !== null);
    check('回答が非表示', a.deletedAt !== null);
    check('経験談が非表示', e.deletedAt !== null);
    const [ao] = await tx.select().from(answers).where(eq(answers.id, s.answerByOther.id));
    check('他人の回答は、単体では非表示になっていない（質問側で非表示になる）', ao.deletedAt === null);

    // 他のユーザーには触れていない
    const [o] = await tx.select().from(users).where(eq(users.id, s.other.id));
    check('他ユーザー: 変更なし', o.name === s.other.name && o.email === s.other.email && o.deletedAt === null);
    const [oc] = await tx.select().from(contacts).where(eq(contacts.id, s.otherContact.id));
    check('他ユーザーのお問い合わせ: 変更なし', oc.name === 'Other Name' && oc.email === s.other.email);
    const otherLogs = await tx.select().from(activityLogs).where(eq(activityLogs.teamId, s.otherTeam.id));
    check('他ユーザーのアクセス履歴: 変更なし', otherLogs[0].userId === s.other.id && otherLogs[0].ipAddress === '203.0.113.2');
    const [oq] = await tx.select().from(questions).where(eq(questions.id, s.otherQuestion.id));
    check('他ユーザーの質問: 変更なし', oq.deletedAt === null);

    // 二重実行
    const again = await deleteUserInTransaction(tx, { userId: s.target.id, mode: 'full', actor: { type: 'self' } });
    check('二重削除は already_deleted', !again.ok && again.code === 'already_deleted', again);
  });

  // ---------------------------------------------------------------
  await inRollback('運営削除（コンテンツを残す・再登録拒否）', async (tx) => {
    const owner = await createUser(tx, 'owner', 'owner');
    const s = await seedTarget(tx, owner.id);

    const result = await deleteUserInTransaction(tx, {
      userId: s.target.id,
      mode: 'keep_content',
      actor: { type: 'admin', id: owner.id },
      reason: '  スパム投稿  ',
      blockReRegistration: true,
    });
    check('成功する', result.ok, result);
    if (!result.ok) return;

    const [d] = await tx.select().from(accountDeletions).where(eq(accountDeletions.id, result.deletionId));
    check('記録: mode / actorType / actorId', d.mode === 'keep_content' && d.actorType === 'admin' && d.actorId === owner.id, d);
    check('記録: reason が trim されている', d.reason === 'スパム投稿', d.reason);
    check('記録: emailHash が元のメールのHMAC', d.emailHash === hashEmailForBlocklist(s.target.email), d.emailHash);
    check('記録: emailHash が元のメールの文字列を含まない', !!d.emailHash && !d.emailHash.includes(RUN));

    const [u] = await tx.select().from(users).where(eq(users.id, s.target.id));
    check('墓標になっている', u.name === null && u.deletedAt !== null && u.email.endsWith('@deleted.invalid'));

    const [q] = await tx.select().from(questions).where(eq(questions.id, s.question.id));
    const [a] = await tx.select().from(answers).where(eq(answers.id, s.answerByTarget.id));
    const [e] = await tx.select().from(experiences).where(eq(experiences.id, s.experience.id));
    check('コンテンツが残っている', q.deletedAt === null && a.deletedAt === null && e.deletedAt === null);

    const invs = await tx.select().from(invitations).where(eq(invitations.teamId, s.team.id));
    const pending = invs.find((i) => i.email === `invitee-${RUN}@example.invalid`);
    const accepted = invs.find((i) => i.email === `invitee2-${RUN}@example.invalid`);
    check('pending の招待が cancelled', pending?.status === 'cancelled', pending);
    check('承諾済みの招待は残る', accepted?.status === 'accepted', accepted);
    const all = await tx.select().from(invitations);
    check('本人のメール宛ての招待は消える', !all.some((i) => i.email.toLowerCase() === s.target.email.toLowerCase()));

    const logs = await tx.select().from(activityLogs).where(eq(activityLogs.teamId, s.team.id));
    check('アクセス履歴の匿名化（Aでも同じ）', logs[0].userId === null && logs[0].ipAddress === null);
  });

  // ---------------------------------------------------------------
  await inRollback('ガード（拒否されて何も変わらない）', async (tx) => {
    const owner = await createUser(tx, 'owner', 'owner');
    const member = await createUser(tx, 'member');
    const victim = await createUser(tx, 'victim');
    const victimTeam = await createTeam(tx, 'victim');
    await join(tx, victim.id, victimTeam.id, 'owner');

    async function expectFail(name: string, params: DeleteUserParams, code: string) {
      const r = await deleteUserInTransaction(tx, params);
      check(`${name}: ${code}`, !r.ok && r.code === code, r);
    }

    await expectFail('不正なID', { userId: 0, mode: 'full', actor: { type: 'self' } }, 'invalid_request');
    await expectFail('存在しないユーザー', { userId: 2_147_000_000, mode: 'full', actor: { type: 'self' } }, 'not_found');
    await expectFail('本人によるコンテンツを残す削除', { userId: victim.id, mode: 'keep_content', actor: { type: 'self' } }, 'invalid_request');
    await expectFail('本人による再登録拒否', { userId: victim.id, mode: 'full', actor: { type: 'self' }, blockReRegistration: true }, 'invalid_request');
    await expectFail('運営削除で理由なし', { userId: victim.id, mode: 'full', actor: { type: 'admin', id: owner.id } }, 'invalid_request');
    await expectFail('運営削除で理由が空白のみ', { userId: victim.id, mode: 'full', actor: { type: 'admin', id: owner.id }, reason: '   ' }, 'invalid_request');
    await expectFail('運営が自分自身を削除', { userId: owner.id, mode: 'full', actor: { type: 'admin', id: owner.id }, reason: 'x' }, 'invalid_request');
    await expectFail('運営でない人による運営削除', { userId: victim.id, mode: 'full', actor: { type: 'admin', id: member.id }, reason: 'x' }, 'forbidden');
    await expectFail('存在しない実行者', { userId: victim.id, mode: 'full', actor: { type: 'admin', id: 2_147_000_000 }, reason: 'x' }, 'forbidden');

    const owner2 = await createUser(tx, 'owner2', 'owner');
    await expectFail('運営アカウントの削除（本人）', { userId: owner2.id, mode: 'full', actor: { type: 'self' } }, 'is_owner');
    await expectFail('運営アカウントの削除（運営）', { userId: owner2.id, mode: 'full', actor: { type: 'admin', id: owner.id }, reason: 'x' }, 'is_owner');

    // 他のメンバーがいるチームのオーナー
    await join(tx, member.id, victimTeam.id, 'member');
    await expectFail('他のメンバーがいるチームのオーナー', { userId: victim.id, mode: 'full', actor: { type: 'self' } }, 'team_owner_has_members');

    // 課金情報のあるチームの最後の1人
    const soloTeam = await createTeam(tx, 'billing');
    const soloUser = await createUser(tx, 'billing');
    await join(tx, soloUser.id, soloTeam.id, 'owner');
    await tx.update(teams).set({ stripeCustomerId: `cus_verify_${RUN}` }).where(eq(teams.id, soloTeam.id));
    await expectFail('課金情報のあるチーム', { userId: soloUser.id, mode: 'full', actor: { type: 'self' } }, 'billing_attached');

    const deletions = await tx.select().from(accountDeletions).where(eq(accountDeletions.userId, victim.id));
    check('拒否された操作は、記録を作らない', deletions.length === 0);
    const [v] = await tx.select().from(users).where(eq(users.id, victim.id));
    check('拒否された操作は、ユーザーを変えない', v.deletedAt === null && v.name === victim.name && v.email === victim.email);
    const [vt] = await tx.select().from(teams).where(eq(teams.id, victimTeam.id));
    check('拒否された操作は、チームを変えない', vt.name === `verify-${RUN}-victim's Team`);
  });

  // ---------------------------------------------------------------
  await inRollback('他のメンバーがいるチームから、オーナーでないメンバーが抜ける', async (tx) => {
    const teamOwner = await createUser(tx, 'teamowner');
    const leaver = await createUser(tx, 'leaver');
    const team = await createTeam(tx, 'shared');
    await join(tx, teamOwner.id, team.id, 'owner');
    await join(tx, leaver.id, team.id, 'member');

    const r = await deleteUserInTransaction(tx, { userId: leaver.id, mode: 'full', actor: { type: 'self' } });
    check('成功する', r.ok, r);

    const members = await tx.select().from(teamMembers).where(eq(teamMembers.teamId, team.id));
    check('メンバーだけ外れる', members.length === 1 && members[0].userId === teamOwner.id, members);
    const [t] = await tx.select().from(teams).where(eq(teams.id, team.id));
    check('チームの名前は変わらない', t.name === `verify-${RUN}-shared's Team`, t.name);
  });

  // ---------------------------------------------------------------
  // 削除の記録の purge_after を過去にずらして、パージを実行する
  async function deleteThenMakeDue(tx: Tx, params: DeleteUserParams) {
    const r = await deleteUserInTransaction(tx, params);
    if (!r.ok) throw new Error(`deleteUser failed: ${JSON.stringify(r)}`);
    await tx
      .update(accountDeletions)
      .set({ purgeAfter: new Date(Date.now() - 1000) })
      .where(eq(accountDeletions.id, r.deletionId));
    return r.deletionId;
  }

  await inRollback('パージ（完全削除）', async (tx) => {
    const owner = await createUser(tx, 'owner', 'owner');
    const s = await seedTarget(tx, owner.id);
    const deletionId = await deleteThenMakeDue(tx, { userId: s.target.id, mode: 'full', actor: { type: 'self' } });

    const due = await tx.select({ id: accountDeletions.id }).from(accountDeletions).where(dueDeletionCondition(new Date()));
    check('期限切れの削除記録が、対象として選ばれる', due.some((d) => d.id === deletionId), due);

    const counts = await purgeAccountDeletionInTransaction(tx, deletionId, new Date());
    check('パージが実行される', counts !== null);
    if (!counts) return;

    check('件数: 質問1・質問タグ1', counts.questions === 1 && counts.questionTags === 1, counts);
    check('件数: 回答2（本人の質問への他人の回答 + 本人の回答）', counts.answers === 2, counts);
    check('件数: 経験談1・経験談タグ1', counts.experiences === 1 && counts.experienceTags === 1, counts);
    check('件数: お問い合わせ1・対応履歴1', counts.contacts === 1 && counts.contactStatusHistory === 1, counts);

    check('本人の質問が消えている', (await tx.select().from(questions).where(eq(questions.authorId, s.target.id))).length === 0);
    check('本人の質問への他人の回答が消えている', (await tx.select().from(answers).where(eq(answers.id, s.answerByOther.id))).length === 0);
    check('本人の回答が消えている', (await tx.select().from(answers).where(eq(answers.id, s.answerByTarget.id))).length === 0);
    check('本人の経験談が消えている', (await tx.select().from(experiences).where(eq(experiences.id, s.experience.id))).length === 0);
    check('本人のお問い合わせが消えている', (await tx.select().from(contacts).where(eq(contacts.userId, s.target.id))).length === 0);
    check('本人のお問い合わせの対応履歴が消えている', (await tx.select().from(contactStatusHistory).where(eq(contactStatusHistory.contactId, s.contact.id))).length === 0);

    // 巻き込まれていない
    check('他人の質問は残っている', (await tx.select().from(questions).where(eq(questions.id, s.otherQuestion.id))).length === 1);
    check('他人の回答は残っている', (await tx.select().from(answers).where(eq(answers.id, s.otherAnswer.id))).length === 1);
    check('他人の質問のタグは残っている', (await tx.select().from(questionTags).where(eq(questionTags.questionId, s.otherQuestion.id))).length === 1);
    check('タグ自体は残っている', (await tx.select().from(tags).where(eq(tags.id, s.tag.id))).length === 1);
    check('他人のお問い合わせは残っている', (await tx.select().from(contacts).where(eq(contacts.id, s.otherContact.id))).length === 1);

    // 残すもの
    const [u] = await tx.select().from(users).where(eq(users.id, s.target.id));
    check('墓標のユーザー行は残っている', u.deletedAt !== null && u.name === null);
    check('アクセス履歴は残っている', (await tx.select().from(activityLogs).where(eq(activityLogs.teamId, s.team.id))).length === 1);
    check('チームは残っている', (await tx.select().from(teams).where(eq(teams.id, s.team.id))).length === 1);
    const [d] = await tx.select().from(accountDeletions).where(eq(accountDeletions.id, deletionId));
    check('purged_at が入っている', d.purgedAt !== null, d);

    check('2回目は何もしない（null）', (await purgeAccountDeletionInTransaction(tx, deletionId, new Date())) === null);
    const due2 = await tx.select({ id: accountDeletions.id }).from(accountDeletions).where(dueDeletionCondition(new Date()));
    check('実行済みは、対象として選ばれない', !due2.some((x) => x.id === deletionId));
  });

  await inRollback('パージ（コンテンツを残す削除）', async (tx) => {
    const owner = await createUser(tx, 'owner', 'owner');
    const s = await seedTarget(tx, owner.id);
    const deletionId = await deleteThenMakeDue(tx, {
      userId: s.target.id,
      mode: 'keep_content',
      actor: { type: 'admin', id: owner.id },
      reason: 'verify',
    });

    const counts = await purgeAccountDeletionInTransaction(tx, deletionId, new Date());
    check('パージが実行される', counts !== null);
    if (!counts) return;

    check('コンテンツは消えない', counts.questions === 0 && counts.answers === 0 && counts.experiences === 0 && counts.questionTags === 0 && counts.experienceTags === 0, counts);
    check('お問い合わせは消える', counts.contacts === 1 && counts.contactStatusHistory === 1, counts);

    check('質問が残っている', (await tx.select().from(questions).where(eq(questions.id, s.question.id))).length === 1);
    check('本人の質問への他人の回答が残っている', (await tx.select().from(answers).where(eq(answers.id, s.answerByOther.id))).length === 1);
    check('本人の回答が残っている', (await tx.select().from(answers).where(eq(answers.id, s.answerByTarget.id))).length === 1);
    check('経験談が残っている', (await tx.select().from(experiences).where(eq(experiences.id, s.experience.id))).length === 1);
    check('タグが残っている', (await tx.select().from(questionTags).where(eq(questionTags.questionId, s.question.id))).length === 1);
    check('お問い合わせが消えている', (await tx.select().from(contacts).where(eq(contacts.userId, s.target.id))).length === 0);
    const [d] = await tx.select().from(accountDeletions).where(eq(accountDeletions.id, deletionId));
    check('purged_at が入っている', d.purgedAt !== null);
  });

  await inRollback('パージ（期限前は何もしない）', async (tx) => {
    const owner = await createUser(tx, 'owner', 'owner');
    const s = await seedTarget(tx, owner.id);
    const r = await deleteUserInTransaction(tx, { userId: s.target.id, mode: 'full', actor: { type: 'self' } });
    if (!r.ok) throw new Error('deleteUser failed');

    const now = new Date();
    check('期限前は null', (await purgeAccountDeletionInTransaction(tx, r.deletionId, now)) === null);
    const due = await tx.select({ id: accountDeletions.id }).from(accountDeletions).where(dueDeletionCondition(now));
    check('期限前は、対象として選ばれない', !due.some((x) => x.id === r.deletionId));
    check('期限前は、質問が消えていない', (await tx.select().from(questions).where(eq(questions.id, s.question.id))).length === 1);
    check('期限前は、purged_at が入らない', (await tx.select().from(accountDeletions).where(eq(accountDeletions.id, r.deletionId)))[0].purgedAt === null);

    // 期限ちょうど（境界）なら実行される
    const atDeadline = await purgeAccountDeletionInTransaction(tx, r.deletionId, r.purgeAfter);
    check('期限ちょうどなら実行される', atDeadline !== null);
    check('期限ちょうどのパージで、質問が消える', (await tx.select().from(questions).where(eq(questions.id, s.question.id))).length === 0);
  });

  // ---------------------------------------------------------------
  // ロールバックの確認: テストデータが残っていない
  const leftUsers = await db.select().from(users).where(like(users.email, `verify-${RUN}-%`));
  const leftTeams = await db.select().from(teams).where(like(teams.name, `verify-${RUN}-%`));
  const leftTags = await db.select().from(tags).where(like(tags.slug, `verify-${RUN}-%`));
  check('ロールバック: テスト用タグが残っていない', leftTags.length === 0, leftTags.length);
  const leftDeletions = await db
    .select()
    .from(accountDeletions)
    .where(and(isNull(accountDeletions.purgedAt), eq(accountDeletions.reason, 'スパム投稿')));
  check('ロールバック: テスト用ユーザーが残っていない', leftUsers.length === 0, leftUsers.length);
  check('ロールバック: テスト用チームが残っていない', leftTeams.length === 0, leftTeams.length);
  check('ロールバック: 削除の記録が残っていない', leftDeletions.length === 0, leftDeletions.length);

  console.log(`\n${checks - failures}/${checks} passed`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end());
