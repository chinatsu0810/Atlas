import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  History,
  MessageCircle,
  Send,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { countries } from '@/lib/constants/countries';
import type { GatherEvent } from '@/lib/db/schema';
import {
  GATHER_THEMES,
  isGatherTheme,
  isGatherWhen,
  type GatherWhen,
} from '@/lib/gather/constants';
import { monthStart, todayInJapan, weekendRange } from '@/lib/gather/dates';
import {
  listGatherEvents,
  listGatherRegions,
  listRecentPastGatherEvents,
} from '@/lib/gather/queries';
import { GatherCountrySelect } from '@/components/gather/country-select';
import { GatherEventRow } from '@/components/gather/event-row';

export const metadata: Metadata = {
  title: '集まる｜海外で、日本語で参加できるイベント',
  description:
    '海外で開催される、日本語で参加できるイベントを探せます。日本人会、在住者の交流会、子育てイベント、セミナー、オンライン交流会など。',
  alternates: { canonical: '/gather' },
};

type Props = {
  searchParams: Promise<{
    country?: string;
    region?: string;
    theme?: string;
    when?: string;
  }>;
};

const chipClass =
  'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition md:text-sm';
const chipOff = 'border-[#D8E7F0] bg-white text-[#35617E] hover:bg-[#F1F8FC]';
const chipOn = 'border-[#1478B8] bg-[#1478B8] text-white';

function groupByMonth(events: GatherEvent[]) {
  const groups = new Map<string, GatherEvent[]>();
  for (const event of events) {
    const key = event.eventDate.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()];
}

export default async function GatherPage({ searchParams }: Props) {
  const params = await searchParams;

  const country = countries.includes(params.country ?? '') ? params.country! : '';
  const region = country ? (params.region ?? '').trim().slice(0, 100) : '';
  const theme = isGatherTheme(params.theme ?? '') ? params.theme! : '';
  const when: GatherWhen = isGatherWhen(params.when ?? '') ? (params.when as GatherWhen) : 'all';

  // 終わったイベント（直近1か月）は、期間を「すべて」「オンライン」にしているときだけ出す。
  // 「今週末」「来月」などは、これからの予定を探す切り替えなので出さない
  const showPast = when === 'all' || when === 'online';

  // テーブルがまだ無い環境（マイグレーション前）でも、ページは空の一覧として表示する
  const [events, pastEvents, regions] = await Promise.all([
    listGatherEvents({ country, region, theme, when }).catch((error) => {
      console.error('Failed to load gather events:', error);
      return [];
    }),
    showPast
      ? listRecentPastGatherEvents({
          country,
          region,
          theme,
          onlineOnly: when === 'online',
        }).catch((error) => {
          console.error('Failed to load past gather events:', error);
          return [];
        })
      : Promise.resolve([]),
    country
      ? listGatherRegions(country).catch((error) => {
          console.error('Failed to load gather regions:', error);
          return [];
        })
      : Promise.resolve([]),
  ]);

  const current = { country, region, theme, when: when === 'all' ? '' : when };

  const filterUrl = (patch: Partial<typeof current>) => {
    const next = { ...current, ...patch };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
    }
    const search = query.toString();
    return search ? `/gather?${search}` : '/gather';
  };

  const today = todayInJapan();
  const [saturday, sunday] = weekendRange(today);
  const thisMonth = Number(monthStart(today).slice(5, 7));
  const nextMonth = Number(monthStart(today, 1).slice(5, 7));

  const whens: { value: GatherWhen; label: string }[] = [
    { value: 'all', label: 'すべて' },
    {
      value: 'weekend',
      label: `今週末（${Number(saturday.slice(8))}・${Number(sunday.slice(8))}日）`,
    },
    { value: 'this-month', label: `${thisMonth}月` },
    { value: 'next-month', label: `${nextMonth}月` },
    { value: 'online', label: 'オンライン' },
  ];

  const filtered = Boolean(country || theme || when !== 'all');
  const groups = groupByMonth(events);

  // 国を変えるときに引き継ぐ条件（地域は国ごとに違うので引き継がない）
  const countryQuery: Record<string, string> = {};
  if (theme) countryQuery.theme = theme;
  if (when !== 'all') countryQuery.when = when;

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-8 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-[#1478B8]" />
              <h1 className="text-xl font-bold">集まる</h1>
            </div>
            <p className="mt-2 text-sm text-[#668096]">
              海外で、日本語で参加できるイベントを探す。
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D8E7F0] bg-white px-4 py-2.5 text-sm font-medium text-[#35617E] transition hover:bg-[#F1F8FC]"
          >
            <Send className="h-4 w-4" />
            掲載を依頼する
          </Link>
        </div>

        <div className="mb-4 space-y-3 rounded-2xl border border-[#DCEAF2] bg-white p-4 shadow-sm">
          <div className="grid gap-1.5 md:grid-cols-[64px_1fr] md:items-center">
            <label htmlFor="gather-country" className="text-xs font-semibold text-[#406783]">
              国
            </label>
            <GatherCountrySelect countries={countries} selected={country} query={countryQuery} />
          </div>

          <div className="grid gap-1.5 md:grid-cols-[64px_1fr] md:items-center">
            <p className="text-xs font-semibold text-[#406783]">地域</p>
            {!country ? (
              <p className="text-xs text-[#8AA0B0]">国を選ぶと、地域で絞り込めます</p>
            ) : regions.length === 0 ? (
              <p className="text-xs text-[#8AA0B0]">この国で掲載中のイベントは、まだありません</p>
            ) : (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                <Link href={filterUrl({ region: '' })} className={`${chipClass} ${!region ? chipOn : chipOff}`}>
                  すべて
                </Link>
                {regions.map((item) => (
                  <Link
                    key={item}
                    href={filterUrl({ region: item })}
                    className={`${chipClass} ${region === item ? chipOn : chipOff}`}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-1.5 md:grid-cols-[64px_1fr] md:items-center">
            <p className="text-xs font-semibold text-[#406783]">テーマ</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              <Link href={filterUrl({ theme: '' })} className={`${chipClass} ${!theme ? chipOn : chipOff}`}>
                すべて
              </Link>
              {GATHER_THEMES.map((item) => (
                <Link
                  key={item}
                  href={filterUrl({ theme: item })}
                  className={`${chipClass} ${theme === item ? chipOn : chipOff}`}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <nav
          aria-label="期間"
          className="mb-2 flex w-max max-w-full gap-1 overflow-x-auto rounded-xl bg-[#E9F0F5] p-1"
        >
          {whens.map((item) => {
            const active = when === item.value;
            return (
              <Link
                key={item.value}
                href={filterUrl({ when: item.value === 'all' ? '' : item.value })}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] transition ${
                  active
                    ? 'bg-white font-bold text-[#123B5D] shadow-sm'
                    : 'text-[#52738B] hover:text-[#123B5D]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div>
            {groups.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#C9DFEA] bg-white px-6 py-14 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-[#B7CCDA]" />
                {filtered ? (
                  <>
                    <p className="mt-3 text-sm text-[#668096]">
                      {pastEvents.length > 0
                        ? '条件に合う、これから開催されるイベントはありません。'
                        : '条件に合うイベントはありません。'}
                    </p>
                    <Link
                      href="/gather"
                      className="mt-4 inline-block rounded-full border border-[#D8E7F0] px-4 py-2 text-sm text-[#35617E] hover:bg-[#F1F8FC]"
                    >
                      条件をはずす
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-[#668096]">
                      {pastEvents.length > 0
                        ? 'これから開催されるイベントは、いまはありません。'
                        : 'まだ掲載中のイベントはありません。'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8AA0B0]">
                      海外で、日本語で参加できるイベントを、これから少しずつ掲載していきます。
                    </p>
                  </>
                )}
              </div>
            ) : (
              groups.map(([month, monthEvents]) => (
                <section key={month}>
                  <h2 className="mb-2.5 mt-5 flex items-baseline gap-2 text-sm font-bold text-[#174C73]">
                    {Number(month.slice(0, 4))}年{Number(month.slice(5, 7))}月
                    <span className="text-xs font-medium text-[#8AA0B0]">{monthEvents.length}件</span>
                  </h2>
                  <div className="space-y-2">
                    {monthEvents.map((event) => (
                      <GatherEventRow key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              ))
            )}

            {pastEvents.length > 0 && (
              <section className="mt-10 border-t border-[#DCEAF2] pt-6">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#406783]">
                  <History className="h-4 w-4" />
                  終わったイベント
                  <span className="text-xs font-medium text-[#8AA0B0]">
                    直近1か月・{pastEvents.length}件
                  </span>
                </h2>
                <p className="mb-3 mt-1 text-xs text-[#8AA0B0]">
                  この1か月に開催されたイベントです。新しい順に並んでいます。
                </p>
                <div className="space-y-2">
                  {pastEvents.map((event) => (
                    <GatherEventRow key={event.id} event={event} ended />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-3 lg:mt-5">
            <section className="rounded-2xl border border-[#C9DFEA] bg-gradient-to-br from-[#EAF6FF] to-[#F4FBF8] p-4">
              <h2 className="text-sm font-bold text-[#123B5D]">イベントを主催していますか？</h2>
              <p className="mt-1.5 text-xs leading-6 text-[#4F6B80]">
                海外で、日本語で参加できるイベントを、運営が確認して掲載します。
              </p>
              <Link
                href="/contact"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1478B8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5686]"
              >
                <Send className="h-4 w-4" />
                掲載を依頼する
              </Link>
            </section>

            <section className="rounded-2xl border border-[#E1EBF1] bg-white p-4">
              <h2 className="text-sm font-bold text-[#123B5D]">
                {country ? `${country}で暮らした人の話` : '暮らした人の話を読む'}
              </h2>
              <p className="mt-1.5 text-xs leading-6 text-[#4F6B80]">
                参加する前に、その国で暮らした人の経験談やQ&amp;Aを読んでおくと安心です。
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={country ? `/experiences?country=${encodeURIComponent(country)}` : '/experiences'}
                  className="flex items-center justify-between rounded-xl border border-[#D8E7F0] bg-[#F8FBFD] px-3 py-2.5 text-sm font-semibold text-[#1478B8] transition hover:bg-[#F1F8FC]"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    経験談
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={country ? `/questions?country=${encodeURIComponent(country)}` : '/questions'}
                  className="flex items-center justify-between rounded-xl border border-[#D8E7F0] bg-[#F8FBFD] px-3 py-2.5 text-sm font-semibold text-[#1478B8] transition hover:bg-[#F1F8FC]"
                >
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    Q&amp;A
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </aside>
        </div>

        <p className="mt-10 text-center text-xs leading-5 text-[#8AA0B0]">
          Atlasはイベントの掲載のみを行っています。申込・参加は、各主催者の案内に従ってください。
        </p>
      </div>
    </main>
  );
}
