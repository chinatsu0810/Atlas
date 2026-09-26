import 'server-only';

import { asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { db } from '@/lib/db/drizzle';
import {
  giveawayImages,
  giveawayMessages,
  giveawayReports,
  giveawayThreads,
  giveaways,
  users,
} from '@/lib/db/schema';

// 運営画面（/account/giveaway-reports）のデータ取得。呼び出し側で isAdmin を確認すること。
// 非表示にした投稿や、削除したメッセージも含めて返す。

export async function countOpenGiveawayReports(): Promise<number> {
  return db.$count(giveawayReports, isNull(giveawayReports.resolvedAt));
}

export async function listGiveawayReports(includeResolved: boolean) {
  const reporter = alias(users, 'reporter');

  return db
    .select({
      id: giveawayReports.id,
      reason: giveawayReports.reason,
      createdAt: giveawayReports.createdAt,
      resolvedAt: giveawayReports.resolvedAt,
      messageId: giveawayReports.messageId,
      giveawayId: giveaways.id,
      giveawayTitle: giveaways.title,
      giveawayDeletedAt: giveaways.deletedAt,
      reporterName: reporter.name,
      reporterDeletedAt: reporter.deletedAt,
    })
    .from(giveawayReports)
    .innerJoin(giveaways, eq(giveawayReports.giveawayId, giveaways.id))
    .leftJoin(reporter, eq(giveawayReports.reporterId, reporter.id))
    .where(includeResolved ? undefined : isNull(giveawayReports.resolvedAt))
    .orderBy(
      sql`${giveawayReports.resolvedAt} is not null`,
      desc(giveawayReports.createdAt)
    )
    .limit(200);
}

export async function getGiveawayReportDetail(reportId: number) {
  const reporter = alias(users, 'reporter');
  const author = alias(users, 'author');

  const [row] = await db
    .select({
      report: giveawayReports,
      giveaway: giveaways,
      reporterName: reporter.name,
      reporterDeletedAt: reporter.deletedAt,
      authorName: author.name,
      authorDeletedAt: author.deletedAt,
    })
    .from(giveawayReports)
    .innerJoin(giveaways, eq(giveawayReports.giveawayId, giveaways.id))
    .leftJoin(reporter, eq(giveawayReports.reporterId, reporter.id))
    .leftJoin(author, eq(giveaways.authorId, author.id))
    .where(eq(giveawayReports.id, reportId))
    .limit(1);

  if (!row) return null;

  const images = await db
    .select({ id: giveawayImages.id, url: giveawayImages.url })
    .from(giveawayImages)
    .where(eq(giveawayImages.giveawayId, row.giveaway.id))
    .orderBy(asc(giveawayImages.position));

  // メッセージの通報なら、そのやりとりの全体を返す
  let thread: {
    applicantId: number;
    applicantName: string | null;
    applicantDeletedAt: Date | null;
    messages: {
      id: number;
      senderId: number | null;
      kind: string;
      body: string;
      createdAt: Date;
      deletedAt: Date | null;
    }[];
  } | null = null;

  if (row.report.messageId !== null) {
    const [message] = await db
      .select({
        threadId: giveawayMessages.threadId,
        applicantId: giveawayThreads.applicantId,
        applicantName: users.name,
        applicantDeletedAt: users.deletedAt,
      })
      .from(giveawayMessages)
      .innerJoin(giveawayThreads, eq(giveawayMessages.threadId, giveawayThreads.id))
      .leftJoin(users, eq(giveawayThreads.applicantId, users.id))
      .where(eq(giveawayMessages.id, row.report.messageId))
      .limit(1);

    if (message) {
      const messages = await db
        .select({
          id: giveawayMessages.id,
          senderId: giveawayMessages.senderId,
          kind: giveawayMessages.kind,
          body: giveawayMessages.body,
          createdAt: giveawayMessages.createdAt,
          deletedAt: giveawayMessages.deletedAt,
        })
        .from(giveawayMessages)
        .where(eq(giveawayMessages.threadId, message.threadId))
        .orderBy(asc(giveawayMessages.createdAt), asc(giveawayMessages.id));

      thread = {
        applicantId: message.applicantId,
        applicantName: message.applicantName,
        applicantDeletedAt: message.applicantDeletedAt,
        messages,
      };
    }
  }

  return { ...row, images, thread };
}
