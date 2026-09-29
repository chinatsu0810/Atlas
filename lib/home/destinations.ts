import 'server-only';

import { and, count, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { experiences, gatherEvents, giveaways, questions } from '@/lib/db/schema';
import { findPlaceByName } from '@/lib/places/data';

// 投稿が少ないうちに枠を埋める国。件数が同じときも、この順を優先する
const DEFAULT_ORDER = [
  'インド',
  '中国',
  'シンガポール',
  'タイ',
  'アメリカ',
  'イギリス',
  'オーストラリア',
  'ドイツ',
];

export type Destination = { name: string; slug: string; flag: string | null };

async function countByCountry(
  query: Promise<{ country: string; n: number }[]>
): Promise<{ country: string; n: number }[]> {
  return query.catch((error) => {
    console.error('Failed to count posts by country:', error);
    return [];
  });
}

// 経験談・質問・譲る・イベントの件数（削除済みを除く）が多い国から並べる
export async function loadDestinations(limit = 8): Promise<Destination[]> {
  const counts = await Promise.all([
    countByCountry(
      db
        .select({ country: experiences.country, n: count() })
        .from(experiences)
        .where(isNull(experiences.deletedAt))
        .groupBy(experiences.country)
    ),
    countByCountry(
      db
        .select({ country: questions.country, n: count() })
        .from(questions)
        .where(isNull(questions.deletedAt))
        .groupBy(questions.country)
    ),
    countByCountry(
      db
        .select({ country: giveaways.country, n: count() })
        .from(giveaways)
        .where(isNull(giveaways.deletedAt))
        .groupBy(giveaways.country)
    ),
    countByCountry(
      db
        .select({ country: gatherEvents.country, n: count() })
        .from(gatherEvents)
        .where(and(isNull(gatherEvents.deletedAt), isNotNull(gatherEvents.publishedAt)))
        .groupBy(gatherEvents.country)
    ),
  ]);

  // 国名は投稿時に自由に入力できるため、lib/places/data.ts にある国だけを出す
  // （「その他」やテスト用の値を出さないため）。「米国」のような別の表記は、その国に合算する
  const totals = new Map<string, number>();
  for (const row of counts.flat()) {
    const place = findPlaceByName(row.country);
    if (!place) continue;
    totals.set(place.name, (totals.get(place.name) ?? 0) + Number(row.n));
  }

  const orderIndex = (name: string) => {
    const index = DEFAULT_ORDER.indexOf(name);
    return index === -1 ? DEFAULT_ORDER.length : index;
  };

  const ranked = [...totals.entries()]
    .sort(([a, x], [b, y]) => y - x || orderIndex(a) - orderIndex(b))
    .map(([name]) => name);

  // 投稿のある国が足りないときは、決めておいた国で埋める
  const names = [...ranked, ...DEFAULT_ORDER.filter((name) => !totals.has(name))].slice(0, limit);

  return names.map((name) => {
    const place = findPlaceByName(name)!;
    return { name, slug: place.slug, flag: place.flag };
  });
}
