import Link from 'next/link';
import { ChevronRight, MapPin, Video } from 'lucide-react';

import type { GatherEvent } from '@/lib/db/schema';
import { dateParts } from '@/lib/gather/dates';

export function gatherPlaceLabel(event: GatherEvent): string {
  if (event.isOnline) return 'オンライン';
  return event.region ? `${event.country}・${event.region}` : event.country;
}

// 「集まる」の一覧の1行。左に日付、右に場所・イベント名・主催者・テーマ。
// ended なら、終わったイベントとして日付を灰色にし「終了」をつける
export function GatherEventRow({
  event,
  ended = false,
}: {
  event: GatherEvent;
  ended?: boolean;
}) {
  const { month, day, weekday } = dateParts(event.eventDate);
  const PlaceIcon = event.isOnline ? Video : MapPin;

  return (
    <Link
      href={`/gather/${event.id}`}
      className="flex items-start gap-3.5 rounded-xl border border-[#E1EBF1] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-4"
    >
      <div
        className={`flex w-[52px] shrink-0 flex-col items-center rounded-xl py-1.5 leading-tight ${
          ended ? 'bg-[#F1F5F8] text-[#8AA0B0]' : 'bg-[#FFF3E8] text-[#B4531A]'
        }`}
      >
        <span className="text-[11px] font-semibold">{month}月</span>
        <span className="my-0.5 text-[22px] font-extrabold tabular-nums">{day}</span>
        <span className="text-[11px]">{weekday}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#668096]">
          {ended && (
            <span className="mr-0.5 rounded bg-[#EEF2F5] px-1.5 py-px text-[10.5px] font-semibold text-[#7F95A6]">
              終了
            </span>
          )}
          <PlaceIcon className="h-3 w-3 shrink-0" />
          <span>{gatherPlaceLabel(event)}</span>
          {event.startTime && (
            <>
              <span className="text-[#C3D1DB]">·</span>
              <span>{event.startTime}〜</span>
            </>
          )}
          <span className="text-[#C3D1DB]">·</span>
          <span>{event.format}</span>
        </p>

        <h3
          className={`mt-1 text-[15px] font-bold leading-6 ${ended ? 'text-[#4F6B80]' : 'text-[#174C73]'}`}
        >
          {event.title}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="text-xs text-[#557086]">主催：{event.organizerName}</span>
          {event.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-[#F1F5F8] px-2.5 py-0.5 text-[11px] text-[#557086]"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      <ChevronRight className="mt-5 h-4 w-4 shrink-0 text-[#B5C6D2]" />
    </Link>
  );
}
