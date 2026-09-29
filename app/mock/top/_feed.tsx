import 'server-only';

import Link from 'next/link';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull } from 'drizzle-orm';
import { ArrowRight, CalendarDays, Gift, MessageCircle, NotebookPen } from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import { experiences, gatherEvents, giveaways, questions } from '@/lib/db/schema';
import { firstUpcomingDate } from '@/lib/gather/dates';

// 本番と同じ DB から読むだけ（書き込みはしない）。
// テーブルが無い・つながらない環境でも、空として表示する
export type FeedItem = {
  kind: 'experience' | 'question' | 'giveaway' | 'gather';
  id: number;
  title: string;
  place: string;
  href: string;
  meta: string;
  at: number;
};

function safe<T>(promise: Promise<T[]>) {
  return promise.catch((error) => {
    console.error('mock/top feed:', error);
    return [] as T[];
  });
}

export async function loadFeed(country = ''): Promise<FeedItem[]> {
  const [exp, qs, gives, events] = await Promise.all([
    safe(
      db
        .select({ id: experiences.id, title: experiences.title, country: experiences.country, createdAt: experiences.createdAt })
        .from(experiences)
        .where(and(isNull(experiences.deletedAt), country ? eq(experiences.country, country) : undefined))
        .orderBy(desc(experiences.createdAt))
        .limit(4),
    ),
    safe(
      db
        .select({ id: questions.id, title: questions.title, country: questions.country, createdAt: questions.createdAt })
        .from(questions)
        .where(and(isNull(questions.deletedAt), country ? eq(questions.country, country) : undefined))
        .orderBy(desc(questions.createdAt))
        .limit(4),
    ),
    safe(
      db
        .select({ id: giveaways.id, title: giveaways.title, country: giveaways.country, city: giveaways.city, createdAt: giveaways.createdAt })
        .from(giveaways)
        .where(
          and(
            isNull(giveaways.deletedAt),
            inArray(giveaways.status, ['open']),
            country ? eq(giveaways.country, country) : undefined,
          ),
        )
        .orderBy(desc(giveaways.createdAt))
        .limit(3),
    ),
    safe(
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
            gte(gatherEvents.eventDate, firstUpcomingDate()),
            country ? eq(gatherEvents.country, country) : undefined,
          ),
        )
        .orderBy(asc(gatherEvents.eventDate))
        .limit(3),
    ),
  ]);

  const items: FeedItem[] = [
    ...exp.map((row) => ({
      kind: 'experience' as const,
      id: row.id,
      title: row.title,
      place: row.country,
      href: `/experiences/${row.id}`,
      meta: new Date(row.createdAt).toLocaleDateString('ja-JP'),
      at: new Date(row.createdAt).getTime(),
    })),
    ...qs.map((row) => ({
      kind: 'question' as const,
      id: row.id,
      title: row.title,
      place: row.country,
      href: `/questions/${row.id}`,
      meta: new Date(row.createdAt).toLocaleDateString('ja-JP'),
      at: new Date(row.createdAt).getTime(),
    })),
    ...gives.map((row) => ({
      kind: 'giveaway' as const,
      id: row.id,
      title: row.title,
      place: `${row.country}・${row.city}`,
      href: `/giveaways/${row.id}`,
      meta: new Date(row.createdAt).toLocaleDateString('ja-JP'),
      at: new Date(row.createdAt).getTime(),
    })),
    ...events.map((row) => ({
      kind: 'gather' as const,
      id: row.id,
      title: row.title,
      place: row.isOnline ? 'オンライン' : [row.country, row.region].filter(Boolean).join('・'),
      href: `/gather/${row.id}`,
      meta: `${Number(row.eventDate.slice(5, 7))}/${Number(row.eventDate.slice(8, 10))} 開催`,
      // イベントは開催日が近いものほど上に出したいので、今の時刻として扱う
      at: Date.now(),
    })),
  ];

  return items.sort((a, b) => b.at - a.at);
}

const KIND = {
  experience: { label: '経験談', icon: NotebookPen, className: 'bg-[#E8F5F3] text-[#1F5F5B]' },
  question: { label: '質問', icon: MessageCircle, className: 'bg-[#FFF4E8] text-[#B45309]' },
  giveaway: { label: '譲ります', icon: Gift, className: 'bg-[#FDF0F4] text-[#B4436B]' },
  gather: { label: 'イベント', icon: CalendarDays, className: 'bg-[#EAF4FB] text-[#1478B8]' },
};

export function KindBadge({ kind }: { kind: FeedItem['kind'] }) {
  const { label, icon: Icon, className } = KIND[kind];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// 経験談・質問・譲る・イベントを1本の流れにまとめる。
// 種類ごとに枠を分けると、投稿が少ない枠が空いて見えるため
export function FeedList({ items, limit = 8 }: { items: FeedItem[]; limit?: number }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center text-sm text-[#678096]">
        まだ投稿はありません。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#EEF3F6] overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
      {items.slice(0, limit).map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Link href={item.href} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[#F8FBFD]">
            <KindBadge kind={item.kind} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-[#174C73] group-hover:text-[#1478B8]">{item.title}</span>
              <span className="block text-[11px] text-[#7F95A6]">
                {item.place}・{item.meta}
              </span>
            </span>
            <ArrowRight className="hidden h-4 w-4 shrink-0 text-[#9EC6DF] sm:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 公的機関のリンク。投稿が少なくても、ここは常に役に立つ
export const OFFICIAL_LINKS = [
  { name: '海外安全ホームページ', owner: '外務省', url: 'https://www.anzen.mofa.go.jp/' },
  { name: '在留届（ORRnet）', owner: '外務省', url: 'https://www.ezairyu.mofa.go.jp/' },
  { name: '在外公館リスト', owner: '外務省', url: 'https://www.mofa.go.jp/mofaj/annai/zaigai/list/index.html' },
  { name: '海外子女教育（CLARINET）', owner: '文部科学省', url: 'https://www.mext.go.jp/a_menu/shotou/clarinet/' },
];
