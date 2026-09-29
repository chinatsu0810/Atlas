import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, Gift, MapPin, MessageCircle, PenLine } from 'lucide-react';
import {
  OTHER_REGION,
  THEMES,
  WHOLE_COUNTRY,
  findPlace,
  findRegion,
  regionLabel,
  type Place,
  type Region,
} from '@/lib/places/data';
import { countByTheme, inRegion, loadPlaceData } from '@/lib/places/queries';
import { AmountLabel, Breadcrumb, Flag, THEME_ICONS } from '@/components/places/ui';

type Props = { params: Promise<{ country: string; region: string }> };

// 地域を分けていない国の「国全体」は、国のページとして見せる
function regionTitle(place: Place, region: Region) {
  return place.regions.length === 0 ? place.name : regionLabel(place, region);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, region: regionSlug } = await params;
  const place = findPlace(country);
  const region = place && findRegion(place, regionSlug);
  if (!place || !region) return {};
  const title = regionTitle(place, region);
  return {
    title: `${title}の海外生活情報｜Atlas`,
    description: `${title}の学校・住まい・医療・生活などについての経験談・Q&A・公式情報。`,
    alternates: { canonical: `/places/${place.slug}/${region.slug}` },
  };
}

export default async function PlaceRegionPage({ params }: Props) {
  const { country, region: regionSlug } = await params;
  const place = findPlace(country);
  const region = place && findRegion(place, regionSlug);
  if (!place || !region) notFound();

  const data = inRegion(await loadPlaceData(place), region);
  const counts = countByTheme(data.posts);
  const withInfo = THEMES.filter((theme) => counts[theme.key] > 0).sort(
    (a, b) => counts[b.key] - counts[a.key]
  );
  const collecting = THEMES.filter((theme) => counts[theme.key] === 0);
  const base = `/places/${place.slug}/${region.slug}`;
  const title = regionTitle(place, region);

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 pb-14 pt-6 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <Breadcrumb
          items={
            place.regions.length === 0
              ? [{ label: 'トップ', href: '/' }, { label: place.name }]
              : [
                  { label: 'トップ', href: '/' },
                  { label: place.name, href: `/places/${place.slug}` },
                  { label: region.name },
                ]
          }
        />

        <div className="flex items-center gap-3">
          {place.regions.length === 0 ? (
            <Flag flag={place.flag} size={44} />
          ) : (
            <MapPin className="h-6 w-6 text-[#1478B8]" />
          )}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        <h2 className="mb-3 mt-8 text-sm font-bold text-[#174C73] md:text-base">知りたいことを選ぶ</h2>

        {withInfo.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center text-sm text-[#678096]">
            {title}の投稿は、まだありません。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {withInfo.map((theme) => {
              const Icon = THEME_ICONS[theme.key];
              return (
                <Link
                  key={theme.key}
                  href={`${base}/${theme.key}`}
                  className="group flex flex-col rounded-xl border border-[#E1EBF1] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md active:bg-[#F8FBFD]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4FB] text-[#1478B8]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-[#174C73]">{theme.label}</h3>
                  <p className="mt-1 flex-1 text-[11px] leading-5 text-[#6D8496] sm:text-xs">{theme.hint}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <AmountLabel count={counts[theme.key]} />
                    <ArrowRight className="h-4 w-4 text-[#4E9BC5] transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {collecting.length > 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-[#CFDDE6] bg-[#F4F8FA] p-4">
            <p className="text-xs font-semibold text-[#4F6B80]">情報を集めているテーマ</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {collecting.map((theme) => {
                const Icon = THEME_ICONS[theme.key];
                return (
                  <Link
                    key={theme.key}
                    href={`${base}/${theme.key}`}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-[#DCE6EC] bg-white px-3.5 text-xs text-[#6B8498] transition hover:border-[#9EC6DF] hover:text-[#1478B8]"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {theme.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">{title}で</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-[#1478B8]" />
                <h3 className="text-sm font-bold text-[#174C73]">譲ります</h3>
              </div>
              {data.giveaways.length === 0 ? (
                <p className="mt-2 text-xs text-[#8AA0B0]">いま募集中のものはありません</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {data.giveaways.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <Link href={`/giveaways/${item.id}`} className="flex justify-between gap-2 text-sm text-[#174C73] hover:text-[#1478B8]">
                        <span className="truncate">{item.title}</span>
                        <span className="shrink-0 text-[11px] text-[#7F95A6]">{item.city}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/giveaways" className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#1478B8]">
                譲る・もらう
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#1478B8]" />
                <h3 className="text-sm font-bold text-[#174C73]">集まる</h3>
              </div>
              {data.events.length === 0 ? (
                <p className="mt-2 text-xs text-[#8AA0B0]">予定されているイベントはありません</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {data.events.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <Link href={`/gather/${item.id}`} className="block text-sm text-[#174C73] hover:text-[#1478B8]">
                        <span className="text-[11px] text-[#7F95A6]">
                          {Number(item.eventDate.slice(5, 7))}/{Number(item.eventDate.slice(8, 10))}・{item.place}
                        </span>
                        <span className="block truncate">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/gather?country=${encodeURIComponent(place.name)}`}
                className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#1478B8]"
              >
                イベントを探す
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm">
              <p className="text-xs leading-5 text-[#648198]">{title}について、知っていることや聞きたいことはありますか？</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/experiences/new"
                  className="inline-flex h-10 items-center gap-1 rounded-full bg-[#1478B8] px-4 text-sm font-semibold text-white hover:bg-[#0D5686]"
                >
                  <PenLine className="h-4 w-4" />
                  経験を書く
                </Link>
                <Link
                  href="/questions/new"
                  className="inline-flex h-10 items-center gap-1 rounded-full border border-[#9EC6DF] px-4 text-sm font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
                >
                  <MessageCircle className="h-4 w-4" />
                  質問する
                </Link>
              </div>
            </div>
          </div>
        </section>

        {region.slug === OTHER_REGION ? (
          <p className="mt-6 text-xs text-[#7F95A6]">
            {place.name}の投稿のうち、どの地域の地名も書かれていないものを表示しています。
          </p>
        ) : (
          region.slug !== WHOLE_COUNTRY && (
            <p className="mt-6 text-xs text-[#7F95A6]">
              本文に「{region.keywords.slice(0, 2).join('」「')}」などの地名がある投稿を表示しています。
            </p>
          )
        )}
      </div>
    </main>
  );
}
