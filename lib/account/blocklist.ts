import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { accountDeletions } from '@/lib/db/schema';
import { hashEmailForBlocklist } from './email-hash';

// 運営削除で「再登録を拒否」を選んだメールアドレスかどうかの照合。
// 仕様は docs/account-deletion.md の「運営削除の追加事項」を参照。

export function blockedEmailCondition(email: string) {
  return eq(accountDeletions.emailHash, hashEmailForBlocklist(email));
}

export async function isReRegistrationBlocked(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: accountDeletions.id })
    .from(accountDeletions)
    .where(blockedEmailCondition(email))
    .limit(1);

  return Boolean(row);
}
