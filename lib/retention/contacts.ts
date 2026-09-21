import { and, eq, inArray, lt, ne, or } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { contacts, contactStatusHistory } from '@/lib/db/schema';

// お問い合わせの保持期間（会員・非会員を問わない）。
// 基準は updated_at。対応完了（resolved）にした日が入る（updateContactStatus）。
// 仕様は docs/account-deletion.md の「保持期間のまとめ」を参照。
export const RESOLVED_CONTACT_RETENTION_YEARS = 1;
// 未完了のまま放置されたものは、最終更新から長めに保持して削除する
export const UNRESOLVED_CONTACT_RETENTION_YEARS = 2;

// inArray のバインド変数が多くなりすぎないようにする
const CHUNK_SIZE = 500;

function yearsAgo(now: Date, years: number): Date {
  const date = new Date(now);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

export type PurgeExpiredContactsResult = {
  dryRun: boolean;
  // 保持期間を過ぎたお問い合わせの件数（dryRun では削除せず、件数だけ返す）
  expiredContacts: number;
  deletedContacts: number;
  deletedStatusHistory: number;
};

/**
 * 保持期間を過ぎたお問い合わせを、対応履歴（contact_status_history）ごと削除する。
 * 子テーブル（履歴）を先に消す。1トランザクションで実行する。
 */
export async function purgeExpiredContacts({
  dryRun = false,
  now = new Date(),
}: {
  dryRun?: boolean;
  now?: Date;
} = {}): Promise<PurgeExpiredContactsResult> {
  const resolvedCutoff = yearsAgo(now, RESOLVED_CONTACT_RETENTION_YEARS);
  const unresolvedCutoff = yearsAgo(now, UNRESOLVED_CONTACT_RETENTION_YEARS);

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        or(
          and(
            eq(contacts.status, 'resolved'),
            lt(contacts.updatedAt, resolvedCutoff)
          ),
          and(
            ne(contacts.status, 'resolved'),
            lt(contacts.updatedAt, unresolvedCutoff)
          )
        )
      );

    const ids = rows.map((row) => row.id);

    const result: PurgeExpiredContactsResult = {
      dryRun,
      expiredContacts: ids.length,
      deletedContacts: 0,
      deletedStatusHistory: 0,
    };

    if (dryRun) {
      return result;
    }

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);

      const history = await tx
        .delete(contactStatusHistory)
        .where(inArray(contactStatusHistory.contactId, chunk))
        .returning({ id: contactStatusHistory.id });

      const removed = await tx
        .delete(contacts)
        .where(inArray(contacts.id, chunk))
        .returning({ id: contacts.id });

      result.deletedStatusHistory += history.length;
      result.deletedContacts += removed.length;
    }

    return result;
  });
}
