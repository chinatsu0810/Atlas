import { desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  accountDeletions,
  answers,
  experiences,
  questions,
  users,
} from '@/lib/db/schema';

// 運営のユーザー管理画面（/account/users）のデータ取得。

// 公開されている（削除されていない）投稿の件数
const questionCount = sql<number>`(
  SELECT count(*)::int FROM ${questions}
  WHERE ${questions.authorId} = ${users.id} AND ${questions.deletedAt} IS NULL
)`;
const answerCount = sql<number>`(
  SELECT count(*)::int FROM ${answers}
  WHERE ${answers.authorId} = ${users.id} AND ${answers.deletedAt} IS NULL
)`;
const experienceCount = sql<number>`(
  SELECT count(*)::int FROM ${experiences}
  WHERE ${experiences.authorId} = ${users.id} AND ${experiences.deletedAt} IS NULL
)`;

const userColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
  deletedAt: users.deletedAt,
  questionCount,
  answerCount,
  experienceCount,
};

export type AdminUserRow = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  deletedAt: Date | null;
  questionCount: number;
  answerCount: number;
  experienceCount: number;
};

/** 削除されていないユーザー（新しい順） */
export async function listActiveUsers(limit = 100): Promise<AdminUserRow[]> {
  return db
    .select(userColumns)
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit);
}

export async function countActiveUsers(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(isNull(users.deletedAt));

  return row?.count ?? 0;
}

/** 削除済みを含む、1人分の情報 */
export async function getUserForAdmin(
  userId: number
): Promise<AdminUserRow | null> {
  const [row] = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

export type DeletionRecord = typeof accountDeletions.$inferSelect;

/** 1人分の削除の記録（新しい順） */
export async function getDeletionRecords(
  userId: number
): Promise<DeletionRecord[]> {
  return db
    .select()
    .from(accountDeletions)
    .where(eq(accountDeletions.userId, userId))
    .orderBy(desc(accountDeletions.requestedAt));
}

/** 最近の削除の記録。emailHash は画面に出さないので、有無だけ返す */
export async function listRecentDeletions(limit = 20) {
  const rows = await db
    .select({
      id: accountDeletions.id,
      userId: accountDeletions.userId,
      mode: accountDeletions.mode,
      actorType: accountDeletions.actorType,
      actorId: accountDeletions.actorId,
      reason: accountDeletions.reason,
      blocked: sql<boolean>`${accountDeletions.emailHash} IS NOT NULL`,
      requestedAt: accountDeletions.requestedAt,
      purgeAfter: accountDeletions.purgeAfter,
      purgedAt: accountDeletions.purgedAt,
    })
    .from(accountDeletions)
    .orderBy(desc(accountDeletions.requestedAt), desc(accountDeletions.id))
    .limit(limit);

  return rows;
}
