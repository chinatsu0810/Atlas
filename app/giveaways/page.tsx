import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Gift, MapPin } from 'lucide-react';

import { countries } from '@/lib/constants/countries';
import {
  GIVEAWAY_CATEGORIES,
  categoryLabel,
  formatPrice,
} from '@/lib/giveaways/constants';
import {
  listGiveaways,
  type GiveawayListFilters,
} from '@/lib/giveaways/queries';
import { GiveawayPostButton } from '@/components/giveaways/post-button';
import { GiveawayStatusBadge } from '@/components/giveaways/status-badge';

export const metadata: Metadata = {
  title: '譲る｜帰国・引越しの不用品を、次に来る人へ',
  description:
    '海外に住む日本人同士で、帰国や引越しで使わなくなった物を譲り合える掲示板です。',
  alternates: { canonical: '/giveaways' },
};

type Props = {
  searchParams: Promise<{
    country?: string;
    city?: string;
    category?: string;
    price?: string;
    all?: string;
    page?: string;
  }>;
};

const selectClass =
  'w-full rounded-xl border border-[#D8E7F0] bg-white px-3 py-2 text-sm text-[#123B5D] outline-none focus:border-[#1478B8]';

export default async function GiveawaysPage({ searchParams }: Props) {
  const params = await searchParams;

  const filters: GiveawayListFilters = {
    countries: params.country ? [params.country] : [],
    city: (params.city ?? '').trim().slice(0, 100),
    category: GIVEAWAY_CATEGORIES.some((c) => c.value === params.category)
      ? params.category!
      : '',
    price: params.price === 'free' || params.price === 'paid' ? params.price : '',
    includeClosed: params.all === '1',
  };

  const parsedPage = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);

  const { items, hasNextPage } = await listGiveaways(filters, page);

  const pageUrl = (target: number) => {
    const query = new URLSearchParams();
    if (params.country) query.set('country', params.country);
    if (filters.city) query.set('city', filters.city);
    if (filters.category) query.set('category', filters.category);
    if (filters.price) query.set('price', filters.price);
    if (filters.includeClosed) query.set('all', '1');
    query.set('page', String(target));
    return `/giveaways?${query.toString()}`;
  };

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-8 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#1478B8]" />
              <h1 className="text-xl font-bold">譲る</h1>
            </div>
            <p className="mt-2 text-sm text-[#668096]">
              帰国・引越しで使わなくなった物を、次に来る人へ。
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/giveaways/guide"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D8E7F0] bg-white px-4 py-2.5 text-sm font-medium text-[#35617E] transition hover:bg-[#F1F8FC]"
            >
              <BookOpen className="h-4 w-4" />
              使い方
            </Link>
            <GiveawayPostButton />
          </div>
        </div>

        <form
          action="/giveaways"
          method="get"
          className="mb-6 grid gap-3 rounded-2xl border border-[#DCEAF2] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          <select name="country" defaultValue={params.country ?? ''} className={selectClass} aria-label="国">
            <option value="">すべての国</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <input
            name="city"
            defaultValue={filters.city}
            placeholder="都市（例：バンコク）"
            className={selectClass}
            aria-label="都市"
          />

          <select name="category" defaultValue={filters.category} className={selectClass} aria-label="カテゴリ">
            <option value="">すべてのカテゴリ</option>
            {GIVEAWAY_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select name="price" defaultValue={filters.price} className={selectClass} aria-label="価格">
            <option value="">無料・有料</option>
            <option value="free">無料のみ</option>
            <option value="paid">有料のみ</option>
          </select>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[#4F6B80]">
              <input type="checkbox" name="all" value="1" defaultChecked={filters.includeClosed} />
              受付終了も表示
            </label>
            <button
              type="submit"
              className="rounded-full bg-[#1478B8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D5686]"
            >
              絞り込む
            </button>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C9DFEA] bg-white px-6 py-16 text-center">
            <p className="text-sm text-[#668096]">
              条件に合う投稿はまだありません。
            </p>
            <p className="mt-1 text-xs text-[#8AA0B0]">
              帰国や引越しで手放す物があれば、最初の投稿をしてみませんか？
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/giveaways/${item.id}`}
                className="group block overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-[#EEF4F8]">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Gift className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#B7CCDA]" />
                  )}
                  {item.status !== 'open' && (
                    <GiveawayStatusBadge status={item.status} className="absolute left-2 top-2" />
                  )}
                </div>

                <div className="p-3">
                  <p className="text-sm font-bold text-[#1478B8]">
                    {formatPrice(item.priceAmount, item.currency)}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#174C73]">
                    {item.title}
                  </h2>
                  <p className="mt-2 flex items-center gap-1 text-xs text-[#8AA0B0]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {item.country}・{item.city}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-[#A3B1BB]">
                    {categoryLabel(item.category)}・
                    {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {(page > 1 || hasNextPage) && (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-lg border border-[#D8E7F0] bg-white px-4 py-2 text-sm text-[#35617E] hover:bg-[#F1F8FC]"
              >
                前へ
              </Link>
            )}
            <span className="text-sm text-[#668096]">{page}ページ</span>
            {hasNextPage && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-lg bg-[#1478B8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D5686]"
              >
                次へ
              </Link>
            )}
          </nav>
        )}

        <p className="mt-10 text-center text-xs leading-5 text-[#8AA0B0]">
          Atlasは場の提供のみを行い、取引の当事者にはなりません。代金のやり取りや受け渡しは、当事者同士の責任で行ってください。
        </p>
      </div>
    </main>
  );
}
