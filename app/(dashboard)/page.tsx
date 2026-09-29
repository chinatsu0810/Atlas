import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ExternalLink,
  Gift,
  Globe,
  Info,
  Landmark,
  MessageCircle,
  PenLine,
  UsersRound,
} from 'lucide-react';
import { loadDestinations } from '@/lib/home/destinations';
import { loadHomeFeed } from '@/lib/home/feed';
import { LatestFeed } from '@/components/home/LatestFeed';
import { PlaceSearch } from '@/components/home/PlaceSearch';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const popularSearches = ['学校', '病院', '住まい', 'ビザ', '赴任準備', '帰国準備'];

// 「探す」以外の用事。機能をカードで並べず、検索の下に同じ大きさで4つだけ置く
const otherActions = [
  { href: '/questions/new', label: '質問する', icon: MessageCircle },
  { href: '/experiences/new', label: '経験を書く', icon: PenLine },
  { href: '/giveaways', label: '譲る・もらう', icon: Gift },
  { href: '/gather', label: '集まる', icon: UsersRound },
];

// 公的機関のリンク。投稿が少ない国でも、ここは必ず役に立つ
const officialLinks = [
  { name: '海外安全ホームページ', owner: '外務省', url: 'https://www.anzen.mofa.go.jp/' },
  { name: '在留届（ORRnet）', owner: '外務省', url: 'https://www.ezairyu.mofa.go.jp/' },
  {
    name: '在外公館リスト',
    owner: '外務省',
    url: 'https://www.mofa.go.jp/mofaj/annai/zaigai/list/index.html',
  },
  {
    name: '海外子女教育（CLARINET）',
    owner: '文部科学省',
    url: 'https://www.mext.go.jp/a_menu/shotou/clarinet/',
  },
];

// ヒーロー画像は左右の縁と上下をぼかし、背景の空のグラデーションになじませる
const heroMask =
  'linear-gradient(to right, transparent 0%, black 30%), linear-gradient(to bottom, transparent 0%, black 20%, black 85%, transparent 100%)';

export default async function DashboardPage() {
  const [feed, destinations] = await Promise.all([loadHomeFeed(), loadDestinations()]);

  return (
    <div className="min-h-screen bg-[#F8FBFD] text-[#123B5D]">
      {/* ファーストビュー：検索窓が主役。
          スマホ・タブレットは写真を上に置き、写真と同じ高さの枠に見出しを縦中央で重ねる。
          PC は写真をコンテンツ幅の中で右に置き、空の部分に見出しと検索カードを重ねる */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#C9E3F4] via-[#E6F2FA] to-[#F8FBFD]">
        <div className="relative mx-auto max-w-[1120px] px-4 pb-6 md:px-6 lg:pb-24 lg:pt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 w-full sm:w-[88%] lg:right-6 lg:top-1/2 lg:w-[72%] lg:-translate-y-1/2 xl:w-[76%]"
            style={{
              aspectRatio: '1983 / 793',
              backgroundImage: "url('/atlas-hero.png.PNG')",
              backgroundSize: '100% 100%',
              maskImage: heroMask,
              maskComposite: 'intersect',
              WebkitMaskImage: heroMask,
              WebkitMaskComposite: 'source-in',
            }}
          />

          <div className="relative max-w-[640px]">
            {/* 写真の高さ（幅÷2.5）と同じ高さ。スマホは画面幅いっぱい、タブレットは88% */}
            <div className="relative flex h-[40vw] flex-col justify-center sm:h-[35.2vw] lg:h-auto">
              <h1 className="text-2xl font-bold leading-[1.35] text-[#0F3150] [text-shadow:0_1px_14px_rgba(255,255,255,0.95)] sm:text-4xl">
                海外生活のこと、
                <br />
                まずここで探す。
              </h1>
              <p className="mt-2 text-sm font-medium text-[#23506F] [text-shadow:0_1px_10px_rgba(255,255,255,0.95)]">
                経験した人の話と、公式情報から。
              </p>
            </div>

            <div className="rounded-2xl border border-[#C9DFEA] bg-white/95 p-3 shadow-[0_14px_36px_rgba(20,73,107,0.18)] backdrop-blur sm:p-4 lg:mt-7">
              <PlaceSearch />

              <div className="mt-3 flex flex-wrap gap-2 px-1">
                {popularSearches.map((word) => (
                  <Link
                    key={word}
                    href={`/search?q=${encodeURIComponent(word)}`}
                    className="flex h-9 items-center rounded-full border border-[#D8E7F0] bg-white px-3.5 text-sm text-[#35617E] transition hover:border-[#9EC6DF] hover:bg-[#F1F8FC] active:bg-[#E6F2FA]"
                  >
                    {word}
                  </Link>
                ))}
              </div>

              {/* スマホでも1画面に収まり、指で押しやすいよう4等分にする */}
              <div className="mt-3 grid grid-cols-4 border-t border-[#EEF3F6] pt-2">
                {otherActions.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[#35617E] transition hover:bg-[#F1F8FC] hover:text-[#1478B8] active:bg-[#E6F2FA] sm:flex-row sm:gap-1.5 sm:text-sm"
                  >
                    <Icon className="h-5 w-5 text-[#1478B8] sm:h-4 sm:w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <p
              role="status"
              className="mt-3 flex items-start gap-1.5 px-1 text-[11px] leading-5 text-[#7F95A6] md:text-xs"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>2026年9月オープン。現在はサンプルの投稿を含めて掲載しています。</span>
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-4 pb-14 md:px-6">
        <section className="pb-8 pt-4 lg:pt-2">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-bold text-[#174C73] md:text-base">行き先から</h2>
            <span className="text-[11px] text-[#7F95A6]">投稿の多い国</span>
            <Link
              href="/places"
              className="ml-auto flex items-center gap-1 self-center text-xs text-[#1478B8] hover:text-[#0D5686] md:text-sm"
            >
              すべての国
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
            {destinations.map((country) => (
              <Link
                key={country.name}
                href={`/places/${country.slug}`}
                className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E1EBF1] bg-white px-1 py-3 transition hover:-translate-y-0.5 hover:border-[#9EC6DF] hover:shadow-sm active:bg-[#F1F8FC]"
              >
                {country.flag ? (
                  <Image
                    src={`/flags/${country.flag}.svg`}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-[#E1EBF1]"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF4FB] text-[#1478B8]">
                    <Globe className="h-5 w-5" />
                  </span>
                )}
                <span className="text-center text-xs font-medium leading-4 text-[#174C73]">
                  {country.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">
              最近Atlasに届いたこと
            </h2>
            <LatestFeed items={feed} />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm">
              <Link href="/experiences" className="flex items-center gap-1 text-[#1478B8] hover:text-[#0D5686]">
                経験談をもっと見る
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/questions" className="flex items-center gap-1 text-[#1478B8] hover:text-[#0D5686]">
                Q&Aをもっと見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <aside className="space-y-4">
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#174C73] md:text-base">
                <Landmark className="h-4 w-4 text-[#1478B8]" />
                公式情報
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
                {officialLinks.map((link) => (
                  <li key={link.url} className="border-b border-[#EEF3F6] last:border-b-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-[#174C73] hover:bg-[#F8FBFD]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{link.name}</span>
                        <span className="text-[11px] text-[#7F95A6]">{link.owner}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9EC6DF]" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <Link
              href="/gather"
              className="flex items-center gap-3 rounded-2xl border border-[#E1EBF1] bg-white px-4 py-3 transition hover:border-[#9EC6DF]"
            >
              <UsersRound className="h-5 w-5 shrink-0 text-[#1478B8]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#174C73]">集まる</span>
                <span className="text-[11px] text-[#7F95A6]">海外で、日本語で参加できるイベント</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#9EC6DF]" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
