import { NextRequest, NextResponse } from 'next/server';

import { purgeDueAccountDeletions } from '@/lib/retention/account-deletions';
import { purgeExpiredContacts } from '@/lib/retention/contacts';
import { runGiveawayMaintenance } from '@/lib/retention/giveaways';

export const dynamic = 'force-dynamic';

// 保持期間を過ぎたデータを削除する日次ジョブ（Vercel Cron。vercel.json）。
//   - 退会から30日たったユーザーのデータ（lib/retention/account-deletions.ts）
//   - 保持期間を過ぎたお問い合わせ（lib/retention/contacts.ts）
//   - 「譲る」の期限切れ・自動完了・古いメッセージの削除（lib/retention/giveaways.ts）
// Vercel Cron は、環境変数 CRON_SECRET が設定されていると
// `Authorization: Bearer <CRON_SECRET>` を付けて呼び出す。
// `?dryRun=1` を付けると、削除せず対象件数だけ返す。
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  // どれかが失敗しても、残りは実行する
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

  const giveaways = await runGiveawayMaintenance({ dryRun }).catch((error) => {
    console.error('Failed to run giveaway maintenance:', error);
    failed = true;
    return { error: 'Maintenance failed' };
  });

  if ('failed' in accountDeletions && accountDeletions.failed > 0) {
    failed = true;
  }

  return NextResponse.json(
    { dryRun, accountDeletions, contacts, giveaways },
    { status: failed ? 500 : 200 }
  );
}
