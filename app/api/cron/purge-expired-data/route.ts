import { NextRequest, NextResponse } from 'next/server';

import { purgeExpiredContacts } from '@/lib/retention/contacts';

export const dynamic = 'force-dynamic';

// 保持期間を過ぎたデータを削除する日次ジョブ（Vercel Cron。vercel.json）。
// Vercel Cron は、環境変数 CRON_SECRET が設定されていると
// `Authorization: Bearer <CRON_SECRET>` を付けて呼び出す。
// `?dryRun=1` を付けると、削除せず対象件数だけ返す。
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  try {
    const contacts = await purgeExpiredContacts({ dryRun });

    return NextResponse.json({ dryRun, contacts });
  } catch (error) {
    console.error('Failed to purge expired data:', error);

    return NextResponse.json({ error: 'Purge failed' }, { status: 500 });
  }
}
