import 'server-only';

import { and, inArray, isNull } from 'drizzle-orm';
import { Resend } from 'resend';

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

// 「譲る」のメール通知。
// 安全のため、メッセージの本文はメールに載せない（投稿タイトルとリンクだけ）。

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Atlas <contact@atlas-community.jp>';

// 新着メッセージのメールは、同じスレッド・同じ相手に15分に1通まで
export const MESSAGE_EMAIL_INTERVAL_MS = 15 * 60 * 1000;

export function appUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BASE_URL ||
    'https://www.atlas-community.jp';

  return `${base.replace(/\/$/, '')}${path}`;
}

type Notice = {
  subject: string;
  lead: string;
  path: string;
};

async function emailsOf(userIds: number[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.id, userIds), isNull(users.deletedAt)));

  return rows.map((row) => row.email);
}

/**
 * ユーザーにお知らせメールを送る。失敗してもログに残すだけで、操作は失敗させない。
 */
export async function notifyUsers(userIds: number[], notice: Notice) {
  const emails = await emailsOf(userIds);

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: FROM,
        to: [email],
        subject: `【Atlas 譲る】${notice.subject}`,
        text: [
          notice.lead,
          '',
          '以下のリンクから確認してください。',
          appUrl(notice.path),
          '',
          '※安全のため、メッセージの内容はメールに載せていません。',
          '※このメールは送信専用です。返信はできません。',
          '',
          'Atlas',
        ].join('\n'),
      });
    } catch (error) {
      console.error('Failed to send giveaway notification:', error);
    }
  }
}

export async function notifyUser(userId: number, notice: Notice) {
  await notifyUsers([userId], notice);
}

export async function notifyAdminOfReport(params: {
  reportId: number;
  giveawayId: number;
  giveawayTitle: string;
  reporterId: number;
  messageId: number | null;
  reason: string;
}) {
  try {
    await resend.emails.send({
      from: FROM,
      to: ['contact@atlas-community.jp'],
      subject: `【Atlas 譲る 通報】${params.giveawayTitle}`,
      text: [
        '「譲る」の投稿に通報がありました。',
        '',
        `確認・対応（運営画面）：${appUrl(`/account/giveaway-reports/${params.reportId}`)}`,
        `投稿：${appUrl(`/giveaways/${params.giveawayId}`)}`,
        `通報したユーザーID：${params.reporterId}`,
        params.messageId ? `対象メッセージID：${params.messageId}` : '対象：投稿',
        '',
        '理由：',
        params.reason,
      ].join('\n'),
    });
  } catch (error) {
    console.error('Failed to send giveaway report email:', error);
  }
}
