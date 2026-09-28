import Link from 'next/link';
import { ChevronRight, MapPin, Video } from 'lucide-react';

import type { GatherEvent } from '@/lib/db/schema';
import { dateParts } from '@/lib/gather/dates';

export function gatherPlaceLabel(event: GatherEvent): string {
  if (event.isOnline) return 'オンライン';
  return event.region ? `${event.country}・${event.region}` : event.country;
}

// 「集まる」の一覧の1行。左に日付、右に場所・イベント名・主催者・テーマ
export function GatherEventRow({ event }: { event: GatherEvent }) {
  const { month, day, weekday } = dateParts(event.eventDate);
  const PlaceIcon = event.isOnline ? Video : MapPin;

  return (
    <Link
      href={`/gather/${event.id}`}
      className="flex items-start gap-3.5 rounded-xl border border-[#E1EBF1] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-4"
    >
      <div className="flex w-[52px] shrink-0 flex-col items-center rounded-xl bg-[#FFF3E8] py-1.5 leading-tight text-[#B4531A]">
        <span className="text-[11px] font-semibold">{month}月</span>
        <span className="my-0.5 text-[22px] font-extrabold tabular-nums">{day}</span>
        <span className="text-[11px]">{weekday}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#668096]">
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

        <h3 className="mt-1 text-[15px] font-bold leading-6 text-[#174C73]">
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
