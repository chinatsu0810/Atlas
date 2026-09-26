import 'server-only';

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { countries } from '@/lib/constants/countries';
import { db } from '@/lib/db/drizzle';
import {
  giveawayImages,
  giveawayMessages,
  giveawayThreads,
  giveaways,
  users,
  type Giveaway,
  type GiveawayThread,
} from '@/lib/db/schema';

export type GiveawayRole = 'owner' | 'applicant';

// ------------------------------------------------------------
// 投稿
// ------------------------------------------------------------

export type GiveawayListFilters = {
  countries: string[];
  city: string;
  category: string;
  price: '' | 'free' | 'paid';
  // true なら、予定者決定以降のものも含める
  includeClosed: boolean;
};

export const GIVEAWAY_PAGE_SIZE = 20;

export async function listGiveaways(
  filters: GiveawayListFilters,
  page: number
) {
  const conditions: SQL[] = [isNull(giveaways.deletedAt)];

  conditions.push(
    filters.includeClosed
      ? inArray(giveaways.status, ['open', 'reserved', 'handed_over', 'completed'])
      : eq(giveaways.status, 'open')
  );

  if (filters.countries.length > 0) {
    const regular = filters.countries.filter((c) => c !== 'その他');
    const countryConditions: SQL[] = [];

    if (regular.length > 0) {
      countryConditions.push(inArray(giveaways.country, regular));
    }

    if (filters.countries.includes('その他')) {
      countryConditions.push(
        notInArray(
          giveaways.country,
          countries.filter((c) => c !== 'その他')
        )
      );
    }

    conditions.push(or(...countryConditions)!);
  }

  if (filters.city) {
    conditions.push(ilike(giveaways.city, `%${filters.city}%`));
  }

  if (filters.category) {
    conditions.push(eq(giveaways.category, filters.category));
  }

  if (filters.price === 'free') {
    conditions.push(
      or(isNull(giveaways.priceAmount), eq(giveaways.priceAmount, 0))!
    );
  } else if (filters.price === 'paid') {
    conditions.push(
      and(isNotNull(giveaways.priceAmount), ne(giveaways.priceAmount, 0))!
    );
  }

  const rows = await db
    .select({
      id: giveaways.id,
      title: giveaways.title,
      category: giveaways.category,
      country: giveaways.country,
      city: giveaways.city,
      priceAmount: giveaways.priceAmount,
      currency: giveaways.currency,
      status: giveaways.status,
      createdAt: giveaways.createdAt,
      // 結合のないクエリでは、Drizzle が sql 内の列をテーブル名なしで出力するため、
      // サブクエリの列は別名を付けて直接書く
      imageUrl: sql<string | null>`(
        select gi.url from giveaway_images gi
        where gi.giveaway_id = "giveaways"."id"
        order by gi.position asc limit 1
      )`,
    })
    .from(giveaways)
    .where(and(...conditions))
    .orderBy(desc(giveaways.createdAt))
    .limit(GIVEAWAY_PAGE_SIZE + 1)
    .offset((page - 1) * GIVEAWAY_PAGE_SIZE);

  return {
    items: rows.slice(0, GIVEAWAY_PAGE_SIZE),
    hasNextPage: rows.length > GIVEAWAY_PAGE_SIZE,
  };
}

export async function getGiveaway(id: number) {
  const [row] = await db
    .select({
      giveaway: giveaways,
      authorName: users.name,
      authorDeletedAt: users.deletedAt,
    })
    .from(giveaways)
    .leftJoin(users, eq(giveaways.authorId, users.id))
    .where(and(eq(giveaways.id, id), isNull(giveaways.deletedAt)))
    .limit(1);

  if (!row) return null;

  const images = await db
    .select({ id: giveawayImages.id, url: giveawayImages.url })
    .from(giveawayImages)
    .where(eq(giveawayImages.giveawayId, id))
    .orderBy(asc(giveawayImages.position));

  return { ...row, images };
}

export async function countApplicants(giveawayId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(giveawayThreads)
    .where(eq(giveawayThreads.giveawayId, giveawayId));

  return row?.count ?? 0;
}

// ------------------------------------------------------------
// スレッド
// ------------------------------------------------------------

// そのスレッドで、自分宛ての未読メッセージの数（自分が送ったものは数えない）
function unreadCountSql(role: GiveawayRole, userId: number) {
  const lastReadAt =
    role === 'owner'
      ? giveawayThreads.ownerLastReadAt
      : giveawayThreads.applicantLastReadAt;

  return sql<number>`(
    select count(*)::int from ${giveawayMessages}
    where ${giveawayMessages.threadId} = ${giveawayThreads.id}
      and ${giveawayMessages.senderId} is distinct from ${userId}
      and ${giveawayMessages.createdAt} > coalesce(${lastReadAt}, 'epoch'::timestamp)
  )`;
}

/** 投稿者が見る、希望者ごとのスレッド一覧 */
export async function listThreadsForOwner(giveawayId: number, ownerId: number) {
  return db
    .select({
      id: giveawayThreads.id,
      applicantId: giveawayThreads.applicantId,
      applicantName: users.name,
      applicantDeletedAt: users.deletedAt,
      lastMessageAt: giveawayThreads.lastMessageAt,
      unread: unreadCountSql('owner', ownerId),
    })
    .from(giveawayThreads)
    .leftJoin(users, eq(giveawayThreads.applicantId, users.id))
    .where(eq(giveawayThreads.giveawayId, giveawayId))
    .orderBy(desc(giveawayThreads.lastMessageAt));
}

export async function findThreadForApplicant(
  giveawayId: number,
  applicantId: number
) {
  const [thread] = await db
    .select()
    .from(giveawayThreads)
    .where(
      and(
        eq(giveawayThreads.giveawayId, giveawayId),
        eq(giveawayThreads.applicantId, applicantId)
      )
    )
    .limit(1);

  return thread ?? null;
}

/**
 * スレッドと、閲覧者の立場を返す。投稿者・希望者以外、または非表示の投稿なら null。
 */
export async function getThreadForViewer(threadId: number, userId: number) {
  const [row] = await db
    .select({ thread: giveawayThreads, giveaway: giveaways })
    .from(giveawayThreads)
    .innerJoin(giveaways, eq(giveawayThreads.giveawayId, giveaways.id))
    .where(and(eq(giveawayThreads.id, threadId), isNull(giveaways.deletedAt)))
    .limit(1);

  if (!row) return null;

  const role = threadRole(row.thread, row.giveaway, userId);
  if (!role) return null;

  return { ...row, role };
}

export function threadRole(
  thread: GiveawayThread,
  giveaway: Giveaway,
  userId: number
): GiveawayRole | null {
  if (giveaway.authorId === userId) return 'owner';
  if (thread.applicantId === userId) return 'applicant';
  return null;
}

/**
 * スレッドにメッセージを書けるか。
 * 募集中はどのスレッドにも書ける。予定者決定・受け渡し済みの間は、予定者とのスレッドだけ。
 */
export function canPostToThread(
  thread: GiveawayThread,
  giveaway: Giveaway
): boolean {
  if (giveaway.deletedAt) return false;
  if (giveaway.status === 'open') return true;

  if (giveaway.status === 'reserved' || giveaway.status === 'handed_over') {
    return giveaway.recipientId === thread.applicantId;
  }

  return false;
}

export async function listMessages(threadId: number) {
  return db
    .select({
      id: giveawayMessages.id,
      senderId: giveawayMessages.senderId,
      kind: giveawayMessages.kind,
      body: giveawayMessages.body,
      createdAt: giveawayMessages.createdAt,
      deletedAt: giveawayMessages.deletedAt,
    })
    .from(giveawayMessages)
    .where(eq(giveawayMessages.threadId, threadId))
    .orderBy(asc(giveawayMessages.createdAt), asc(giveawayMessages.id));
}

export async function markThreadRead(threadId: number, role: GiveawayRole) {
  await db
    .update(giveawayThreads)
    .set(
      role === 'owner'
        ? { ownerLastReadAt: new Date() }
        : { applicantLastReadAt: new Date() }
    )
    .where(eq(giveawayThreads.id, threadId));
}

// ------------------------------------------------------------
// マイページ・ヘッダー
// ------------------------------------------------------------

/** 自分宛ての未読メッセージの合計（ヘッダーのバッジ用） */
export async function getUnreadTotal(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(giveawayMessages)
    .innerJoin(giveawayThreads, eq(giveawayMessages.threadId, giveawayThreads.id))
    .innerJoin(giveaways, eq(giveawayThreads.giveawayId, giveaways.id))
    .where(
      and(
        isNull(giveaways.deletedAt),
        sql`${giveawayMessages.senderId} is distinct from ${userId}`,
        or(
          and(
            eq(giveaways.authorId, userId),
            sql`${giveawayMessages.createdAt} > coalesce(${giveawayThreads.ownerLastReadAt}, 'epoch'::timestamp)`
          ),
          and(
            eq(giveawayThreads.applicantId, userId),
            sql`${giveawayMessages.createdAt} > coalesce(${giveawayThreads.applicantLastReadAt}, 'epoch'::timestamp)`
          )
        )
      )
    );

  return row?.count ?? 0;
}

/** 自分の投稿（未読件数つき） */
export async function listMyGiveaways(userId: number) {
  return db
    .select({
      id: giveaways.id,
      title: giveaways.title,
      status: giveaways.status,
      city: giveaways.city,
      country: giveaways.country,
      createdAt: giveaways.createdAt,
      // サブクエリの列は別名を付けて直接書く（listGiveaways の imageUrl と同じ理由）
      applicants: sql<number>`(
        select count(*)::int from giveaway_threads gt
        where gt.giveaway_id = "giveaways"."id"
      )`,
      unread: sql<number>`(
        select count(*)::int from giveaway_messages gm
        inner join giveaway_threads gt on gt.id = gm.thread_id
        where gt.giveaway_id = "giveaways"."id"
          and gm.sender_id is distinct from ${userId}
          and gm.created_at > coalesce(gt.owner_last_read_at, 'epoch'::timestamp)
      )`,
    })
    .from(giveaways)
    .where(and(eq(giveaways.authorId, userId), isNull(giveaways.deletedAt)))
    .orderBy(desc(giveaways.createdAt));
}

/** 自分が希望した投稿（未読件数つき） */
export async function listMyApplications(userId: number) {
  const author = alias(users, 'author');

  return db
    .select({
      threadId: giveawayThreads.id,
      giveawayId: giveaways.id,
      title: giveaways.title,
      status: giveaways.status,
      recipientId: giveaways.recipientId,
      city: giveaways.city,
      country: giveaways.country,
      authorName: author.name,
      authorDeletedAt: author.deletedAt,
      lastMessageAt: giveawayThreads.lastMessageAt,
      unread: unreadCountSql('applicant', userId),
    })
    .from(giveawayThreads)
    .innerJoin(giveaways, eq(giveawayThreads.giveawayId, giveaways.id))
    .leftJoin(author, eq(giveaways.authorId, author.id))
    .where(
      and(eq(giveawayThreads.applicantId, userId), isNull(giveaways.deletedAt))
    )
    .orderBy(desc(giveawayThreads.lastMessageAt));
}
