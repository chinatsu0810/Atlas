import { NextRequest, NextResponse } from 'next/server';

import { purgeDueAccountDeletions } from '@/lib/retention/account-deletions';
import { purgeExpiredContacts } from '@/lib/retention/contacts';

export const dynamic = 'force-dynamic';

// 保持期間を過ぎたデータを削除する日次ジョブ（Vercel Cron。vercel.json）。
//   - 退会から30日たったユーザーのデータ（lib/retention/account-deletions.ts）
//   - 保持期間を過ぎたお問い合わせ（lib/retention/contacts.ts）
// Vercel Cron は、環境変数 CRON_SECRET が設定されていると
// `Authorization: Bearer <CRON_SECRET>` を付けて呼び出す。
// `?dryRun=1` を付けると、削除せず対象件数だけ返す。
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  // 片方が失敗しても、もう片方は実行する
  let failed = false;

  const accountDeletions = await purgeDueAccountDeletions({ dryRun }).catch(
    (error) => {
      console.error('Failed to purge account deletions:', error);
      failed = true;
      return { error: 'Purge failed' };
    }
  );

  const contacts = await purgeExpiredContacts({ dryRun }).catch((error) => {
    console.error('Failed to purge expired contacts:', error);
    failed = true;
    return { error: 'Purge failed' };
  });

  if ('failed' in accountDeletions && accountDeletions.failed > 0) {
    failed = true;
  }

  return NextResponse.json(
    { dryRun, accountDeletions, contacts },
    { status: failed ? 500 : 200 }
  );
}
