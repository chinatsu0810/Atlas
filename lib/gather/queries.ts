import 'server-only';

import {
  and,
  arrayContains,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  type SQL,
} from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { gatherEvents } from '@/lib/db/schema';
import type { GatherWhen } from '@/lib/gather/constants';
import {
  addDays,
  monthStart,
  todayInJapan,
  weekendRange,
} from '@/lib/gather/dates';

export type GatherEventFilters = {
  country: string;
  region: string;
  theme: string;
  when: GatherWhen;
};

// 公開中で、まだ終わっていないイベント。
// 日本より時差が遅い国のために、日本時間の前日に開催されたものまで含める
function upcomingPublished(): SQL[] {
  return [
    isNull(gatherEvents.deletedAt),
    isNotNull(gatherEvents.publishedAt),
    gte(gatherEvents.eventDate, addDays(todayInJapan(), -1)),
  ];
}

export async function listGatherEvents(filters: GatherEventFilters) {
  const conditions = upcomingPublished();
  const today = todayInJapan();

  if (filters.country) conditions.push(eq(gatherEvents.country, filters.country));
  if (filters.region) conditions.push(eq(gatherEvents.region, filters.region));
  if (filters.theme) {
    conditions.push(arrayContains(gatherEvents.themes, [filters.theme]));
  }

  if (filters.when === 'weekend') {
    const [saturday, sunday] = weekendRange(today);
    conditions.push(
      gte(gatherEvents.eventDate, saturday),
      lte(gatherEvents.eventDate, sunday)
    );
  } else if (filters.when === 'this-month' || filters.when === 'next-month') {
    const offset = filters.when === 'this-month' ? 0 : 1;
    conditions.push(
      gte(gatherEvents.eventDate, monthStart(today, offset)),
      lt(gatherEvents.eventDate, monthStart(today, offset + 1))
    );
  } else if (filters.when === 'online') {
    conditions.push(eq(gatherEvents.isOnline, true));
  }

  return db
    .select()
    .from(gatherEvents)
    .where(and(...conditions))
    .orderBy(asc(gatherEvents.eventDate), asc(gatherEvents.id))
    .limit(200);
}

// 国を選んだときに出す、地域の選択肢（公開中のイベントがある地域だけ）
export async function listGatherRegions(country: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ region: gatherEvents.region })
    .from(gatherEvents)
    .where(
      and(
        ...upcomingPublished(),
        eq(gatherEvents.country, country),
        isNotNull(gatherEvents.region)
      )
    )
    .orderBy(asc(gatherEvents.region));

  return rows.map((row) => row.region!).filter(Boolean);
}

// 下書きも含めて返す。公開前のものを見せてよいかは、呼び出し側で判断すること
export async function getGatherEvent(id: number) {
  const [row] = await db
    .select()
    .from(gatherEvents)
    .where(and(eq(gatherEvents.id, id), isNull(gatherEvents.deletedAt)))
    .limit(1);

  return row ?? null;
}

// 運営画面の一覧。呼び出し側で isAdmin を確認すること
export async function listGatherEventsForAdmin() {
  return db
    .select()
    .from(gatherEvents)
    .where(isNull(gatherEvents.deletedAt))
    .orderBy(desc(gatherEvents.eventDate), desc(gatherEvents.id))
    .limit(500);
}
