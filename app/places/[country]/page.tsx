import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { OTHER_REGION, THEMES, WHOLE_COUNTRY, findPlace, regionsOf } from '@/lib/places/data';
import { countByTheme, inRegion, loadPlaceData } from '@/lib/places/queries';
import { AmountLabel, Breadcrumb, Flag, THEME_ICONS } from '@/components/places/ui';

type Props = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = findPlace((await params).country);
  if (!place) return {};
  return {
    title: `${place.name}の海外生活情報｜Atlas`,
    description: `${place.name}で暮らす・これから行く人のための、地域ごとの経験談・Q&A・公式情報。`,
    alternates: { canonical: `/places/${place.slug}` },
  };
}

export default async function PlaceCountryPage({ params }: Props) {
  const place = findPlace((await params).country);
  if (!place) notFound();

  // 地域を分けていない国は、国全体のページへ直接進む
  if (place.regions.length === 0) {
    redirect(`/places/${place.slug}/${WHOLE_COUNTRY}`);
  }

  const data = await loadPlaceData(place);

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 pb-14 pt-6 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: place.name }]} />

        <div className="flex items-center gap-3">
          <Flag flag={place.flag} size={44} />
          <h1 className="text-2xl font-bold">{place.name}</h1>
        </div>

        <h2 className="mb-3 mt-8 text-sm font-bold text-[#174C73] md:text-base">地域を選ぶ</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {regionsOf(place).map((region) => {
            const posts = inRegion(data, region).posts;
            const counts = countByTheme(posts);
            // 投稿の多いテーマを、中身の予告として3つまで見せる
            const topThemes = THEMES.filter((theme) => counts[theme.key] > 0)
              .sort((a, b) => counts[b.key] - counts[a.key])
              .slice(0, 3);
            const whole = region.slug === WHOLE_COUNTRY;

            return (
              <Link
                key={region.slug}
                href={`/places/${place.slug}/${region.slug}`}
                className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9EC6DF] hover:shadow-md ${
                  whole ? 'border-dashed border-[#C9DDE9] md:col-span-2' : 'border-[#E1EBF1]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-[#1478B8]" />
                    <h3 className="text-base font-bold text-[#174C73]">{region.name}</h3>
                  </div>
                  <AmountLabel count={posts.length} />
                </div>
                {whole && (
                  <p className="mt-1 pl-6 text-xs text-[#6D8496]">地域が書かれていない投稿も含めて、すべて見る</p>
                )}
                {region.slug === OTHER_REGION && (
                  <p className="mt-1 pl-6 text-xs text-[#6D8496]">上のどの地域の地名も書かれていない投稿</p>
                )}
                <div className="mt-3 flex min-h-[26px] flex-wrap items-center gap-1.5 pl-6">
                  {topThemes.map((theme) => {
                    const Icon = THEME_ICONS[theme.key];
                    return (
                      <span
                        key={theme.key}
                        className="flex items-center gap-1 rounded-full bg-[#F1F5F8] px-2.5 py-1 text-xs text-[#557086]"
                      >
                        <Icon className="h-3 w-3" />
                        {theme.label}
                      </span>
                    );
                  })}
                  <ArrowRight className="ml-auto h-4 w-4 text-[#4E9BC5] transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-[#C9DDE9] bg-white px-4 py-4 text-sm text-[#557086] sm:flex-row sm:items-center sm:justify-between">
          <p>探している地域がないときは、{place.name}全体から探すか、質問してみてください。</p>
          <Link
            href="/questions/new"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#9EC6DF] px-4 text-sm font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
          >
            <MessageCircle className="h-4 w-4" />
            質問する
          </Link>
        </div>
      </div>
    </main>
  );
}
