import Link from 'next/link';
import { ArrowLeft, ChevronRight, Flag } from 'lucide-react';

import { isAdmin } from '@/lib/auth/permissions';
import { getUser } from '@/lib/db/queries';
import { listGiveawayReports } from '@/lib/giveaways/admin';
import { displayAuthorName } from '@/lib/users/display';
import { AccessDenied } from '../users/access-denied';

export default async function GiveawayReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return <AccessDenied />;
  }

  const includeResolved = (await searchParams).all === '1';
  const reports = await listGiveawayReports(includeResolved);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/account"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        マイページへ戻る
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Flag className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold tracking-tight">「譲る」の通報</h1>
        </div>

        <Link
          href={includeResolved ? '/account/giveaway-reports' : '/account/giveaway-reports?all=1'}
          className="text-sm text-[#1478B8] underline"
        >
          {includeResolved ? '未対応だけ表示' : '対応済みも表示'}
        </Link>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        通報を開くと、投稿やメッセージの内容を確認し、非表示・削除できます。
      </p>

      {reports.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {includeResolved ? '通報はありません。' : '未対応の通報はありません。'}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/account/giveaway-reports/${report.id}`}
                className="flex items-center gap-3 rounded-xl border p-4 transition hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {report.resolvedAt ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500">
                        対応済み
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                        未対応
                      </span>
                    )}
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">
                      {report.messageId !== null ? 'メッセージ' : '投稿'}
                    </span>
                    {report.giveawayDeletedAt && (
                      <span className="text-muted-foreground">投稿は非表示中</span>
                    )}
                    <span className="text-muted-foreground">
                      {new Date(report.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold">{report.giveawayTitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {displayAuthorName(report.reporterName, report.reporterDeletedAt)}：
                    {report.reason}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
