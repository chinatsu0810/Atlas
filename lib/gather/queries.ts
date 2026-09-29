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
  notInArray,
  type SQL,
} from 'drizzle-orm';

import { countries } from '@/lib/constants/countries';
import { db } from '@/lib/db/drizzle';
import { gatherEvents } from '@/lib/db/schema';
import type { GatherWhen } from '@/lib/gather/constants';
import {
  addMonths,
  firstUpcomingDate,
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

// 終わったイベントも、この日以降に開催されたものは一覧に残す（直近1か月）
function recentPastFrom(): string {
  return addMonths(todayInJapan(), -1);
}

function published(): SQL[] {
  return [isNull(gatherEvents.deletedAt), isNotNull(gatherEvents.publishedAt)];
}

// 「その他」は、選択肢にない国（国名を書いて登録したもの）すべて
function countryIs(country: string): SQL {
  return country === 'その他'
    ? notInArray(gatherEvents.country, countries.filter((item) => item !== 'その他'))
    : eq(gatherEvents.country, country);
}

// 国・地域・テーマの絞り込み
function placeAndTheme(filters: Omit<GatherEventFilters, 'when'>): SQL[] {
  const conditions: SQL[] = [];

  if (filters.country) conditions.push(countryIs(filters.country));
  if (filters.region) conditions.push(eq(gatherEvents.region, filters.region));
  if (filters.theme) {
    conditions.push(arrayContains(gatherEvents.themes, [filters.theme]));
  }

  return conditions;
}

// これから開催されるイベント（開催日の近い順）
export async function listGatherEvents(filters: GatherEventFilters) {
  const conditions = [
    ...published(),
    gte(gatherEvents.eventDate, firstUpcomingDate()),
    ...placeAndTheme(filters),
  ];
  const today = todayInJapan();

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

// 直近1か月に終わったイベント（開催日の新しい順）。
// 「ちょっと前に何があったか」を見られるように、これからのイベントの下に出す
export async function listRecentPastGatherEvents(
  filters: Omit<GatherEventFilters, 'when'> & { onlineOnly: boolean }
) {
  const conditions = [
    ...published(),
    gte(gatherEvents.eventDate, recentPastFrom()),
    lt(gatherEvents.eventDate, firstUpcomingDate()),
    ...placeAndTheme(filters),
  ];

  if (filters.onlineOnly) conditions.push(eq(gatherEvents.isOnline, true));

  return db
    .select()
    .from(gatherEvents)
    .where(and(...conditions))
    .orderBy(desc(gatherEvents.eventDate), desc(gatherEvents.id))
    .limit(100);
}

// 国を選んだときに出す、地域の選択肢（一覧に出るイベントがある地域だけ）
export async function listGatherRegions(country: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ region: gatherEvents.region })
    .from(gatherEvents)
    .where(
      and(
        ...published(),
        gte(gatherEvents.eventDate, recentPastFrom()),
        countryIs(country),
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
