import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  giveawayMessages,
  giveawayThreads,
  giveaways,
} from '@/lib/db/schema';
import {
  AUTO_COMPLETE_DAYS,
  MESSAGE_RETENTION_DAYS,
} from '@/lib/giveaways/constants';

// 「譲る」の日次ジョブ（app/api/cron/purge-expired-data）。
//   1. 募集期限を過ぎた「募集中」を「期限切れ」にする
//   2. 受け渡し済みから7日たったものを「完了」にする（予定者が確認しなかった場合）
//   3. 完了・取り下げ・期限切れから1年たったものの、メッセージ（スレッドごと）を削除する

const DAY_MS = 24 * 60 * 60 * 1000;

export type GiveawayMaintenanceResult = {
  dryRun: boolean;
  expired: number;
  autoCompleted: number;
  purgedThreads: number;
};

export async function runGiveawayMaintenance({
  dryRun = false,
  now = new Date(),
}: {
  dryRun?: boolean;
  now?: Date;
} = {}): Promise<GiveawayMaintenanceResult> {
  const expireCondition = and(
    eq(giveaways.status, 'open'),
    lte(giveaways.expiresAt, now)
  );

  const autoCompleteCondition = and(
    eq(giveaways.status, 'handed_over'),
    lte(giveaways.handedOverAt, new Date(now.getTime() - AUTO_COMPLETE_DAYS * DAY_MS))
  );

  const purgeGiveawayIds = db
    .select({ id: giveaways.id })
    .from(giveaways)
    .where(
      and(
        inArray(giveaways.status, ['completed', 'withdrawn', 'expired']),
        isNotNull(giveaways.closedAt),
        lte(
          giveaways.closedAt,
          new Date(now.getTime() - MESSAGE_RETENTION_DAYS * DAY_MS)
        )
      )
    );

  if (dryRun) {
    const [expired, autoCompleted, purgedThreads] = await Promise.all([
      db.$count(giveaways, expireCondition),
      db.$count(giveaways, autoCompleteCondition),
      db.$count(
        giveawayThreads,
        inArray(giveawayThreads.giveawayId, purgeGiveawayIds)
      ),
    ]);

    return { dryRun, expired, autoCompleted, purgedThreads };
  }

  const expired = await db
    .update(giveaways)
    .set({ status: 'expired', closedAt: now, updatedAt: now })
    .where(expireCondition)
    .returning({ id: giveaways.id });

  const autoCompleted = await db.transaction(async (tx) => {
    const completed = await tx
      .update(giveaways)
      .set({ status: 'completed', closedAt: now, updatedAt: now })
      .where(autoCompleteCondition)
      .returning({ id: giveaways.id, recipientId: giveaways.recipientId });

    for (const giveaway of completed) {
      if (giveaway.recipientId === null) continue;

      const [thread] = await tx
        .select({ id: giveawayThreads.id })
        .from(giveawayThreads)
        .where(
          and(
            eq(giveawayThreads.giveawayId, giveaway.id),
            eq(giveawayThreads.applicantId, giveaway.recipientId)
          )
        )
        .limit(1);

      if (!thread) continue;

      await tx.insert(giveawayMessages).values({
        threadId: thread.id,
        senderId: null,
        kind: 'system',
        body: `受け渡しの報告から${AUTO_COMPLETE_DAYS}日たったため、自動で完了になりました。`,
        createdAt: now,
      });

      await tx
        .update(giveawayThreads)
        .set({ lastMessageAt: now })
        .where(eq(giveawayThreads.id, thread.id));
    }

    return completed;
  });

  // メッセージはスレッドの削除で一緒に消える（ON DELETE CASCADE）
  const purgedThreads = await db
    .delete(giveawayThreads)
    .where(inArray(giveawayThreads.giveawayId, purgeGiveawayIds))
    .returning({ id: giveawayThreads.id });

  return {
    dryRun,
    expired: expired.length,
    autoCompleted: autoCompleted.length,
    purgedThreads: purgedThreads.length,
  };
}
