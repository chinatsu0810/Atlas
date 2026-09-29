import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  Gift,
  MessageCircle,
  NotebookPen,
  PenLine,
} from 'lucide-react';
import {
  THEMES,
  WHOLE_COUNTRY,
  findPlace,
  findRegion,
  regionLabel,
  findTheme,
  type Place,
  type Region,
} from '@/lib/places/data';
import { officialLinksFor } from '@/lib/places/links';
import { getPublishedGuide } from '@/lib/ai/guides/queries';
import { GuideSummary } from '@/components/places/guide-summary';
import { countByTheme, inRegion, inTheme, loadPlaceData } from '@/lib/places/queries';
import {
  Breadcrumb,
  EmptyInvite,
  ExperienceCards,
  OfficialLinks,
  QuestionList,
  SectionTitle,
  THEME_ICONS,
} from '@/components/places/ui';

type Props = { params: Promise<{ country: string; region: string; theme: string }> };

// 経験談・Q&Aは、多すぎると読み切れないので上限を決め、続きは検索で見てもらう
const EXPERIENCE_LIMIT = 6;
const QUESTION_LIMIT = 10;

function placeTitle(place: Place, region: Region) {
  return place.regions.length === 0 ? place.name : regionLabel(place, region);
}

// ページの見出し。国全体なら「インドの〜」、地域なら「デリー / グルガオンの〜」
function pageTitle(place: Place, region: Region, themeLabel: string) {
  const name = region.slug === WHOLE_COUNTRY ? place.name : regionLabel(place, region);
  return `${name}の${themeLabel}`;
}

async function resolve(params: Props['params']) {
  const { country, region: regionSlug, theme: themeKey } = await params;
  const place = findPlace(country);
  const region = place && findRegion(place, regionSlug);
  const theme = findTheme(themeKey);
  return place && region && theme ? { place, region, theme } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { place, region, theme } = resolved;
  const title = pageTitle(place, region, theme.label);
  return {
    title: `${title}｜Atlas`,
    description: `${title}について、経験した人の話・Q&A・公式情報をまとめて見られます。`,
    alternates: { canonical: `/places/${place.slug}/${region.slug}/${theme.key}` },
  };
}

export default async function PlaceThemePage({ params }: Props) {
  const resolved = await resolve(params);
  if (!resolved) notFound();
  const { place, region, theme } = resolved;

  const [placeData, guide] = await Promise.all([
    loadPlaceData(place),
    getPublishedGuide(place.slug, region.slug, theme.key),
  ]);
  const regionData = inRegion(placeData, region);
  const data = inTheme(regionData, theme);
  const experiences = data.posts.filter((post) => post.kind === 'experience');
  const questions = data.posts.filter((post) => post.kind === 'question');
  const otherCounts = countByTheme(regionData.posts);

  const Icon = THEME_ICONS[theme.key];
  const regionHref = `/places/${place.slug}/${region.slug}`;
  const title = pageTitle(place, region, theme.label);
  const searchHref = `/search?q=${encodeURIComponent(`${place.name} ${theme.label.split('・')[0]}`)}`;

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 pb-14 pt-6 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[960px]">
        <Breadcrumb
          items={[
            { label: 'トップ', href: '/' },
            ...(place.regions.length === 0
              ? [{ label: place.name, href: regionHref }]
              : [
                  { label: place.name, href: `/places/${place.slug}` },
                  { label: region.name, href: regionHref },
                ]),
            { label: theme.label },
          ]}
        />

        <header className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm md:p-7">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1478B8]">
            <Icon className="h-4 w-4" />
            {theme.label}
          </p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{title}</h1>
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="このページの内容">
            {[
              ...(guide ? [{ href: '#summary', label: 'まとめ' }] : []),
              { href: '#links', label: '公式情報' },
              { href: '#experiences', label: `経験談 ${experiences.length}` },
              { href: '#questions', label: `Q&A ${questions.length}` },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex h-9 items-center rounded-full border border-[#D8E7F0] bg-white px-3.5 text-sm text-[#35617E] transition hover:border-[#9EC6DF] hover:bg-[#F1F8FC]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-10 space-y-12">
          {guide && (
            <section id="summary" className="scroll-mt-28">
              <GuideSummary content={guide.content} publishedAt={guide.publishedAt} />
            </section>
          )}

          <section id="links" className="scroll-mt-28">
            <SectionTitle icon={BookMarked} title="公式情報" />
            <OfficialLinks links={officialLinksFor(place, theme.key)} />
            <p className="mt-3 text-[11px] leading-5 text-[#7F95A6]">
              最新の内容は、リンク先で確認してください。
            </p>
          </section>

          <section id="experiences" className="scroll-mt-28">
            <SectionTitle
              icon={NotebookPen}
              title="経験した人の話"
              aside={
                <Link
                  href="/experiences/new"
                  className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#1478B8]"
                >
                  <PenLine className="h-4 w-4" />
                  書く
                </Link>
              }
            />
            {experiences.length === 0 ? (
              <EmptyInvite
                text={`${title}についての経験談は、まだありません。`}
                href="/experiences/new"
                label="最初の経験談を書く"
              />
            ) : (
              <ExperienceCards posts={experiences.slice(0, EXPERIENCE_LIMIT)} />
            )}
          </section>

          <section id="questions" className="scroll-mt-28">
            <SectionTitle
              icon={MessageCircle}
              title="Q&A"
              aside={
                <Link
                  href="/questions/new"
                  className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#1478B8]"
                >
                  <MessageCircle className="h-4 w-4" />
                  質問する
                </Link>
              }
            />
            {questions.length === 0 ? (
              <EmptyInvite
                text="まだ質問はありません。知りたいことを聞いてみませんか？"
                href="/questions/new"
                label="質問する"
              />
            ) : (
              <QuestionList posts={questions.slice(0, QUESTION_LIMIT)} />
            )}
            {(experiences.length > EXPERIENCE_LIMIT || questions.length > QUESTION_LIMIT) && (
              <Link href={searchHref} className="mt-3 flex items-center gap-1 text-sm text-[#1478B8]">
                もっと見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </section>

          {(data.giveaways.length > 0 || data.events.length > 0) && (
            <section className="grid gap-4 md:grid-cols-2">
              {data.giveaways.length > 0 && (
                <div className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-[#1478B8]" />
                    <h2 className="text-sm font-bold text-[#174C73]">譲ります</h2>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {data.giveaways.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/giveaways/${item.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[#F8FBFD] px-3 py-2 text-sm text-[#174C73] hover:bg-[#F1F8FC]"
                        >
                          <span className="truncate">{item.title}</span>
                          <span className="shrink-0 text-[11px] text-[#7F95A6]">{item.city}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.events.length > 0 && (
                <div className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#1478B8]" />
                    <h2 className="text-sm font-bold text-[#174C73]">集まる</h2>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {data.events.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link href={`/gather/${item.id}`} className="block rounded-lg bg-[#F8FBFD] px-3 py-2 hover:bg-[#F1F8FC]">
                          <span className="text-[11px] text-[#7F95A6]">
                            {Number(item.eventDate.slice(5, 7))}/{Number(item.eventDate.slice(8, 10))}・{item.place}
                          </span>
                          <span className="block truncate text-sm text-[#174C73]">{item.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-[#DCEAF2] bg-white p-5">
            <h2 className="text-sm font-bold text-[#174C73]">{placeTitle(place, region)}のほかのテーマ</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.filter((item) => item.key !== theme.key).map((item) => {
                const count = otherCounts[item.key];
                return (
                  <Link
                    key={item.key}
                    href={`${regionHref}/${item.key}`}
                    className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs transition hover:border-[#9EC6DF] ${
                      count > 0
                        ? 'border-[#D8E7F0] bg-white text-[#35617E]'
                        : 'border-dashed border-[#DCE6EC] bg-[#F8FBFD] text-[#8AA0B0]'
                    }`}
                  >
                    {item.label}
                    {count > 0 && <span className="text-[10px] text-[#7F95A6]">{count}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
