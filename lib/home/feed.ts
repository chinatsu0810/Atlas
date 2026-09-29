import 'server-only';

import { and, asc, desc, eq, gte, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { experiences, gatherEvents, giveaways, questions } from '@/lib/db/schema';
import { firstUpcomingDate } from '@/lib/gather/dates';

export type FeedItem = {
  kind: 'experience' | 'question' | 'giveaway' | 'gather';
  id: number;
  title: string;
  place: string;
  href: string;
  meta: string;
};

// 取得に失敗しても（テーブルが無い環境など）、トップは空の一覧として表示する
function orEmpty<T>(promise: Promise<T[]>) {
  return promise.catch((error) => {
    console.error('Failed to load home feed:', error);
    return [] as T[];
  });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('ja-JP');
}

// トップの「最近Atlasに届いたこと」。
// 経験談・質問・譲る・イベントを種類ごとに分けず、1本の流れにまとめる。
// 種類ごとに枠を分けると、投稿が少ない枠が空いて見えるため
export async function loadHomeFeed(): Promise<FeedItem[]> {
  const [newExperiences, newQuestions, openGiveaways, upcomingEvents] = await Promise.all([
    orEmpty(
      db
        .select({
          id: experiences.id,
          title: experiences.title,
          country: experiences.country,
          createdAt: experiences.createdAt,
        })
        .from(experiences)
        .where(isNull(experiences.deletedAt))
        .orderBy(desc(experiences.createdAt))
        .limit(4)
    ),
    orEmpty(
      db
        .select({
          id: questions.id,
          title: questions.title,
          country: questions.country,
          createdAt: questions.createdAt,
        })
        .from(questions)
        .where(isNull(questions.deletedAt))
        .orderBy(desc(questions.createdAt))
        .limit(4)
    ),
    orEmpty(
      db
        .select({
          id: giveaways.id,
          title: giveaways.title,
          country: giveaways.country,
          city: giveaways.city,
          createdAt: giveaways.createdAt,
        })
        .from(giveaways)
        .where(and(isNull(giveaways.deletedAt), eq(giveaways.status, 'open')))
        .orderBy(desc(giveaways.createdAt))
        .limit(3)
    ),
    orEmpty(
      db
        .select({
          id: gatherEvents.id,
          title: gatherEvents.title,
          country: gatherEvents.country,
          region: gatherEvents.region,
          eventDate: gatherEvents.eventDate,
          isOnline: gatherEvents.isOnline,
        })
        .from(gatherEvents)
        .where(
          and(
            isNull(gatherEvents.deletedAt),
            isNotNull(gatherEvents.publishedAt),
            gte(gatherEvents.eventDate, firstUpcomingDate())
          )
        )
        .orderBy(asc(gatherEvents.eventDate))
        .limit(2)
    ),
  ]);

  const posts = [
    ...newExperiences.map((row) => ({
      kind: 'experience' as const,
      id: row.id,
      title: row.title,
      place: row.country,
      href: `/experiences/${row.id}`,
      createdAt: row.createdAt,
    })),
    ...newQuestions.map((row) => ({
      kind: 'question' as const,
      id: row.id,
      title: row.title,
      place: row.country,
      href: `/questions/${row.id}`,
      createdAt: row.createdAt,
    })),
    ...openGiveaways.map((row) => ({
      kind: 'giveaway' as const,
      id: row.id,
      title: row.title,
      place: `${row.country}・${row.city}`,
      href: `/giveaways/${row.id}`,
      createdAt: row.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ createdAt, ...item }) => ({ ...item, meta: formatDate(createdAt) }));

  // 近く開催されるイベントは、投稿日ではなく開催日で意味があるため、先頭に置く
  const events: FeedItem[] = upcomingEvents.map((row) => ({
    kind: 'gather',
    id: row.id,
    title: row.title,
    place: row.isOnline ? 'オンライン' : [row.country, row.region].filter(Boolean).join('・'),
    href: `/gather/${row.id}`,
    meta: `${Number(row.eventDate.slice(5, 7))}/${Number(row.eventDate.slice(8, 10))} 開催`,
  }));

  return [...events, ...posts];
}
