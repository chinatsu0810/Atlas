import Link from 'next/link';
import { ArrowLeft, CalendarDays, ExternalLink, Plus } from 'lucide-react';

import { DeleteGatherEventButton } from '@/components/gather/delete-event-button';
import { isAdmin } from '@/lib/auth/permissions';
import { getUser } from '@/lib/db/queries';
import type { GatherEvent } from '@/lib/db/schema';
import { setGatherEventPublished } from '@/lib/gather/actions';
import { addDays, formatEventDate, todayInJapan } from '@/lib/gather/dates';
import { listGatherEventsForAdmin } from '@/lib/gather/queries';
import { AccessDenied } from '../users/access-denied';

function statusOf(event: GatherEvent, yesterday: string) {
  if (!event.publishedAt) {
    return { label: '下書き', className: 'bg-gray-100 text-gray-600' };
  }
  if (event.eventDate < yesterday) {
    return { label: '終了', className: 'bg-gray-100 text-gray-400' };
  }
  return { label: '公開中', className: 'bg-emerald-50 text-emerald-700' };
}

export default async function GatherEventsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return <AccessDenied />;
  }

  const { saved } = await searchParams;

  let events: GatherEvent[] = [];
  let loadFailed = false;

  try {
    events = await listGatherEventsForAdmin();
  } catch (error) {
    console.error('Failed to load gather events for admin:', error);
    loadFailed = true;
  }

  const yesterday = addDays(todayInJapan(), -1);

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
          <CalendarDays className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold tracking-tight">「集まる」のイベント</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/gather"
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-[#1478B8] hover:bg-[#F1F8FC]"
          >
            公開ページ
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/account/gather-events/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1478B8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D5686]"
          >
            <Plus className="h-4 w-4" />
            イベントを追加
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        主催者から依頼を受けたイベントや、運営が選んだイベントを登録します。公開すると「集まる」に表示されます。
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saved === 'publish' ? '保存して公開しました。' : '下書きとして保存しました。'}
        </p>
      )}

      {loadFailed ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-700">
          イベントを読み込めませんでした。データベースに gather_events テーブルがあるか確認してください
          （マイグレーション 0024_gather_events.sql）。
        </div>
      ) : events.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          まだイベントはありません。「イベントを追加」から登録できます。
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {events.map((event) => {
            const status = statusOf(event, yesterday);

            return (
              <li key={event.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                  <span className="text-muted-foreground">
                    {formatEventDate(event.eventDate)}
                    {event.startTime && ` ${event.startTime}`}
                  </span>
                  <span className="text-muted-foreground">
                    {event.isOnline ? 'オンライン' : [event.country, event.region].filter(Boolean).join('・')}
                  </span>
                </div>

                <Link
                  href={`/gather/${event.id}`}
                  className="mt-1.5 block truncate text-sm font-semibold hover:text-[#1478B8]"
                >
                  {event.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">主催：{event.organizerName}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-3">
                  <Link
                    href={`/account/gather-events/${event.id}/edit`}
                    className="rounded-full px-3 py-1.5 text-xs text-[#1478B8] transition hover:bg-[#F1F8FC]"
                  >
                    編集
                  </Link>

                  <form action={setGatherEventPublished}>
                    <input type="hidden" name="id" value={event.id} />
                    <input type="hidden" name="publish" value={event.publishedAt ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100"
                    >
                      {event.publishedAt ? '下書きに戻す' : '公開する'}
                    </button>
                  </form>

                  <DeleteGatherEventButton id={event.id} title={event.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
