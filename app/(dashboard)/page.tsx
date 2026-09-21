import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CircleUserRound,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { experiences, questions, users } from '@/lib/db/schema';
import { displayAuthorName } from '@/lib/users/display';

const popularSearchTags = [
  'インド',
  'シンガポール',
  '子育て',
  '教育',
  '仕事',
  '住まい',
  'ビザ',
];

const experienceTypeTags = [
  '駐在員',
  '帯同家族',
  '移住者',
  '留学生',
  'ワーホリ',
  '現地採用',
  '起業',
  'フリーランス',
  'ノマド',
  '永住者',
  '帰国済み',
];

const countryTags = [
  'アメリカ',
  'シンガポール',
  'インド',
  '中国',
  'オーストラリア',
  'タイ',
  'イギリス',
  'カナダ',
  'その他',
];

const familyTags = [
  '単身',
  '夫婦',
  '未就学児あり',
  '小学生あり',
  '中高生あり',
  '妊娠中',
  'ペットあり',
];

const categoryCards = [
  {
    icon: '✈️',
    title: '海外赴任が\n決まった',
    description: '帯同や家族とのこと、\n準備どうだった？',
    href: '/search?q=駐在',
    color: 'bg-[#EAF6FF]',
  },
  {
    icon: '👨‍👩‍👧',
    title: '子どもの学校を\n探したい',
    description: 'インター校・現地校・\n日本人学校など',
    href: '/search?q=学校',
    color: 'bg-[#EFFAF7]',
  },
  {
    icon: '💻',
    title: '現地で働きたい',
    description: '仕事内容・ビザ・\nキャリアのこと',
    href: '/search?q=仕事',
    color: 'bg-[#FFF7EF]',
  },
  {
    icon: '🏠',
    title: '住まいを探したい',
    description: 'エリア・家賃・治安・\n生活環境など',
    href: '/search?q=住まい',
    color: 'bg-[#F4F2FF]',
  },
  {
    icon: '🛂',
    title: 'ビザを取得したい',
    description: '手続き・必要書類・\n注意点など',
    href: '/search?q=ビザ',
    color: 'bg-[#EEF8FF]',
  },
];

function SectionHeading({
  icon,
  title,
  description,
  href = '/search',
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[#1478B8]">{icon}</span>
        <h2 className="shrink-0 text-base font-bold text-[#123B5D] md:text-lg">
          {title}
        </h2>
        {description && (
          <p className="hidden truncate text-sm text-[#6B8498] md:block">
            {description}
          </p>
        )}
      </div>

      <Link
        href={href}
        className="flex shrink-0 items-center gap-1 text-sm text-[#1478B8] hover:text-[#0D5686]"
      >
        もっと見る
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CardMetaRow({
  author,
  date,
}: {
  author: string;
  date: string;
}) {
  return (
    <div className="mt-3 flex items-center border-t border-[#E8EEF2] pt-3 text-xs text-[#7890A2]">
      <div className="flex min-w-0 items-center gap-1">
        <CircleUserRound className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{author}</span>
        <span>・</span>
        <span className="shrink-0">{date}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const featuredQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        isNull(questions.deletedAt),
        eq(questions.featuredForAnswer, true),
      ),
    )
    .orderBy(desc(questions.createdAt))
    .limit(4);

  const newExperiences = await db
    .select({
      id: experiences.id,
      title: experiences.title,
      content: experiences.content,
      country: experiences.country,
      createdAt: experiences.createdAt,
      authorName: users.name,
      authorDeletedAt: users.deletedAt,
    })
    .from(experiences)
    .leftJoin(users, eq(experiences.authorId, users.id))
    .where(isNull(experiences.deletedAt))
    .orderBy(desc(experiences.createdAt))
    .limit(3);

  return (
    <div className="min-h-screen bg-[#F8FBFD] text-[#123B5D]">
      <section className="relative">
<div
className="relative left-1/2 h-[225px] w-[105vw] -translate-x-1/2 bg-contain bg-center bg-no-repeat sm:h-[270px] md:h-[345px] lg:h-[460px]"
  style={{
    backgroundImage: "url('/atlas-hero.png.PNG')",
  }}
  aria-label="Atlasの紹介"
/>

 <div className="relative mx-auto -mt-5 w-[90%] max-w-[780px] md:-mt-8 md:w-[70%]">
    <div className="rounded-2xl border border-[#C9DFEA] bg-white/95 p-2.5 shadow-[0_14px_36px_rgba(20,73,107,0.18)] backdrop-blur">
      <form
  action="/search"
  method="get"
  className="flex items-center gap-3 px-4 md:px-6"
>
  <Search className="h-5 w-5 shrink-0 text-[#1478B8]" />

  <input
    type="search"
    name="q"
    placeholder="どんな経験を探していますか？（国・都市・テーマなど）"
    className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#123B5D] outline-none placeholder:text-[#8AA0B0] md:text-base"
  />

  <button
    type="submit"
    className="rounded-full bg-[#1478B8] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0D5686]"
  >
    検索
  </button>
</form>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#EEF3F6] px-3 pt-3 md:px-5">
        <span className="mr-1 text-xs font-semibold text-[#406783] md:text-sm">
          よく探されているテーマ
        </span>

        {popularSearchTags.map((tag) => (
          <Link
            key={tag}
            href={`/search?q=${encodeURIComponent(tag)}`}
            className="rounded-full border border-[#D8E7F0] bg-white px-3 py-1.5 text-xs text-[#35617E] transition hover:border-[#9EC6DF] hover:bg-[#F1F8FC] md:text-sm"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  </div>
</section>







<div className="mx-auto w-full max-w-[1120px] px-4 pt-4 md:px-6">
  <div
    role="status"
    className="rounded-xl border border-[#F3D39A] bg-[#FFF8E8] px-4 py-3 text-center text-sm font-semibold text-[#8A5A12] shadow-sm"
  >
    <p>本サイトは2026年9月にオープンしました。</p>
    <p>
      現在は開発用サンプルデータを中心に掲載しており、これから皆さんの経験とともに育てていくコミュニティです。
    </p>
    <p className="mt-3"></p>
    <p>未来の自分のために。そして、いつか同じ道を歩く誰かのために。</p>
    <p>最初の経験を残してみませんか。</p>
  </div>
</div>







      <main className="mx-auto max-w-[1120px] px-4 pb-12 pt-8 md:px-6 md:pt-10">
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-bold text-[#174C73] md:text-base">
            こんな経験を探していますか？
          </h2>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {categoryCards.map((card, index) => (
              <Link
                key={card.title}
                href={card.href}
                className={`${card.color} ${index >= 4 ? 'hidden sm:block' : ''} group rounded-xl border border-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:p-4`}
              >
                <div className="mb-3 text-3xl">{card.icon}</div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h3 className="whitespace-pre-line text-sm font-bold leading-6 text-[#174C73]">
                      {card.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-[#648198] sm:text-xs">
                      {card.description}
                    </p>
                  </div>

                  <ArrowRight className="mb-1 hidden h-4 w-4 shrink-0 text-[#4E9BC5] transition group-hover:translate-x-1 sm:block" />
                </div>
              </Link>
            ))}
          </div>
        </section>

       <section className="mb-10 grid gap-6 border-y border-[#DCEAF2] py-6 md:grid-cols-3 md:gap-8">
          <div>
            <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">
              経験から探す
            </h2>

            <div className="flex flex-wrap gap-2">
              {experienceTypeTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-[#D8E7F0] bg-white px-3.5 py-1.5 text-xs text-[#35617E] shadow-sm hover:bg-[#F1F8FC] md:text-sm"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

<div className="border-t border-[#DCEAF2] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
  <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">
    国から探す
  </h2>

  <div className="flex flex-wrap gap-2">
    {countryTags.map((tag) => (
      <Link
        key={tag}
        href={`/search?q=${encodeURIComponent(tag)}`}
        className="rounded-full border border-[#D8E7F0] bg-white px-3.5 py-1.5 text-xs text-[#35617E] shadow-sm hover:bg-[#F1F8FC] md:text-sm"
      >
        {tag}
      </Link>
    ))}
  </div>
</div>

          <div className="border-t border-[#DCEAF2] pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">
              家族構成から探す
            </h2>

            <div className="flex flex-wrap gap-2">
              {familyTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-[#D8E7F0] bg-white px-3.5 py-1.5 text-xs text-[#35617E] shadow-sm hover:bg-[#F1F8FC] md:text-sm"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
       <SectionHeading
  icon={<MessageCircle className="h-5 w-5" />}
  title="回答募集中の質問"
  description="現在、回答を募集している質問です。あなたの経験が誰かのヒントになります。"
  href="/questions"
/>

          {featuredQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-10 text-center text-sm text-[#678096]">
              現在、回答募集中の質問はありません。
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredQuestions.map((question) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="rounded-xl border border-[#E1EBF1] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="inline-block rounded-full bg-[#E8F6FC] px-2.5 py-1 text-xs text-[#1478B8]">
                    {question.country}
                  </span>

                  <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-[#174C73]">
                    {question.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6D8496]">
                    {question.content}
                  </p>

                  <div className="mt-4 text-xs text-[#8AA0B0]">
                    回答募集中
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading
            icon={<Sparkles className="h-5 w-5" />}
            title="新着の経験"
            description="みんなのリアルな体験談が続々と投稿されています"
            href="/experiences"
          />

          {newExperiences.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-10 text-center text-sm text-[#678096]">
              まだ投稿された経験談はありません。
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {newExperiences.map((experience) => (
                <Link
                  key={experience.id}
                  href={`/experiences/${experience.id}`}
                  className="block overflow-hidden rounded-xl border border-[#E1EBF1] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="h-24 bg-gradient-to-br from-[#8CC5E4] to-[#377DA4]" />

                  <div className="p-4">
                    <span className="rounded-full bg-[#E8F6FC] px-2.5 py-1 text-xs text-[#1478B8]">
                      {experience.country}
                    </span>

                    <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-[#174C73]">
                      {experience.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6D8496]">
                      {experience.content}
                    </p>

                    <CardMetaRow
                      author={displayAuthorName(
                        experience.authorName,
                        experience.authorDeletedAt
                      )}
                      date={new Date(experience.createdAt).toLocaleDateString('ja-JP')}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}