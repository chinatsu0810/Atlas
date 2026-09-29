import Link from 'next/link';
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  Flag,
  Gift,
  GraduationCap,
  Info,
  Lightbulb,
  MessageCircle,
  NotebookPen,
  PenLine,
  School,
  UsersRound,
  WandSparkles,
} from 'lucide-react';
import { SCHOOL_GUIDE, type Country, type Region } from './_data';
import { ExperienceList } from './_experience-list';
import { Breadcrumb, FactItem, HUB_ROOT, SectionTitle, SourceBadge, SourceLegend } from './_ui';

const toc = [
  { href: '#basics', label: 'まず知っておきたいこと' },
  { href: '#self-check', label: '自分の状況を整理する' },
  { href: '#types', label: '学校の種類' },
  { href: '#practical', label: '費用・入学・通学' },
  { href: '#experiences', label: '実際に経験した人の話' },
  { href: '#qa', label: 'Q&A' },
  { href: '#links', label: '公式・参考情報' },
  { href: '#nearby', label: 'この地域で役立つこと' },
];

function hostOf(url: string) {
  return url ? new URL(url).host : '';
}

export function SchoolGuide({ country, region }: { country: Country; region: Region }) {
  const guide = SCHOOL_GUIDE;
  const base = `${HUB_ROOT}/${country.slug}/${region.slug}`;

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-14 pt-6 md:px-6">
      <Breadcrumb
        items={[
          { label: '情報ハブ', href: HUB_ROOT },
          { label: country.name, href: `${HUB_ROOT}/${country.slug}` },
          { label: region.name, href: base },
          { label: '学校・教育' },
        ]}
      />

      {/* ページの見出し */}
      <header className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm md:p-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1478B8]">
          <GraduationCap className="h-4 w-4" />
          学校・教育
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#123B5D] md:text-3xl">グルガオンの学校選び</h1>
        <p className="mt-2 text-sm text-[#406783]">経験談・Q&A・公式情報をまとめています。選ぶのは、あなたです。</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7F95A6]">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            最終更新 {guide.updatedAt}
          </span>
          <span>
            経験談 {guide.counts.experiences}件・Q&A {guide.counts.questions}件・公式リンク {guide.counts.links}件 をもとに整理
          </span>
        </div>

        <details className="group mt-4 rounded-xl bg-[#F8FBFD] px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-[#35617E]">
            <Info className="h-3.5 w-3.5" />
            このページの情報の見方
            <span className="text-[#7F95A6] group-open:hidden">（開く）</span>
          </summary>
          <p className="mb-3 mt-2 text-xs leading-5 text-[#6B8498]">
            すべての情報に「どこから来た情報か」を付けています。Atlasが独自に判断した内容と、外部の情報は混ぜていません。
          </p>
          <SourceLegend />
        </details>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0 space-y-12">
          {/* スマホ用の目次 */}
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden" aria-label="目次">
            {toc.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap rounded-full border border-[#D8E7F0] bg-white px-3 py-1.5 text-xs text-[#35617E]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <section>
            <SectionTitle
              id="basics"
              icon={Lightbulb}
              title="まず知っておきたいこと"
            />
            <ul className="space-y-2">
              {guide.basics.map((fact) => (
                <FactItem key={fact.text} fact={fact} />
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle
              id="self-check"
              icon={ClipboardList}
              title="自分の状況を整理する"
              description="決めた人が考えていたこと"
            />
            <ul className="grid gap-2 md:grid-cols-2">
              {guide.selfCheck.map((item) => (
                <li key={item.question}>
                  <a
                    href={item.href}
                    className="group flex h-full items-start gap-3 rounded-xl border border-[#E1EBF1] bg-white px-4 py-3 transition hover:border-[#9EC6DF]"
                  >
                    <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#4E9BC5]" />
                    <span className="flex-1">
                      <span className="block text-sm leading-6 text-[#174C73]">{item.question}</span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-[#1478B8]">
                        関係する情報：{item.related}
                        <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle
              id="types"
              icon={School}
              title="学校の種類"
              description="並び順はおすすめ順ではありません"
            />
            <div className="grid gap-4 md:grid-cols-2">
              {guide.schoolTypes.map((type) => (
                <article key={type.key} className="flex flex-col rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-[#174C73]">{type.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#648198]">{type.summary}</p>

                  <dl className="mt-4 divide-y divide-[#EEF3F6] rounded-xl bg-[#F8FBFD] px-3 text-xs">
                    {type.features.map((feature) => (
                      <div key={feature.label} className="grid grid-cols-[84px_1fr] gap-2 py-2">
                        <dt className="text-[#7F95A6]">{feature.label}</dt>
                        <dd className="text-[#29465C]">{feature.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 flex-1">
                    <p className="text-xs font-semibold text-[#406783]">検討した人が確認していたこと</p>
                    <ul className="mt-1.5 space-y-1 text-xs leading-5 text-[#557086]">
                      {type.checkPoints.map((point) => (
                        <li key={point} className="flex gap-1.5">
                          <span className="text-[#9EC6DF]">・</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#EEF3F6] pt-3">
                    <a
                      href="#experiences"
                      className="flex items-center gap-1 rounded-full bg-[#E8F5F3] px-2.5 py-1 text-[11px] font-semibold text-[#1F5F5B] hover:opacity-80"
                    >
                      <NotebookPen className="h-3 w-3" />
                      経験談 {type.experienceCount}件
                    </a>
                    <a
                      href="#qa"
                      className="flex items-center gap-1 rounded-full bg-[#FFF4E8] px-2.5 py-1 text-[11px] font-semibold text-[#B45309] hover:opacity-80"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Q&A {type.questionCount}件
                    </a>
                    <a
                      href="#links"
                      className="flex items-center gap-1 rounded-full bg-[#EAF4FB] px-2.5 py-1 text-[11px] font-semibold text-[#1478B8] hover:opacity-80"
                    >
                      <BookMarked className="h-3 w-3" />
                      公式情報
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle
              id="practical"
              icon={ClipboardList}
              title="費用・入学・通学など"
            />
            <div className="grid gap-5 md:grid-cols-2">
              {guide.practical.map((block) => (
                <div key={block.key}>
                  <h3 className="mb-2 text-sm font-bold text-[#174C73]">{block.title}</h3>
                  <ul className="space-y-2">
                    {block.facts.map((fact) => (
                      <FactItem key={fact.text} fact={fact} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle
                id="experiences"
                icon={NotebookPen}
                title="実際に経験した人の話"
              />
              <span className="mt-1 shrink-0">
                <SourceBadge kind="experience" />
              </span>
            </div>
            <ExperienceList experiences={guide.experiences} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link href="/experiences" className="flex items-center gap-1 text-sm text-[#1478B8] hover:text-[#0D5686]">
                経験談をすべて見る（{guide.counts.experiences}件）
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/experiences/new"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#9EC6DF] bg-white px-4 py-2 text-xs font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
              >
                <PenLine className="h-3.5 w-3.5" />
                学校選びの経験を書く
              </Link>
            </div>
          </section>

          <section>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle
                id="qa"
                icon={MessageCircle}
                title="Q&A"
              />
              <span className="mt-1 shrink-0">
                <SourceBadge kind="qa" />
              </span>
            </div>
            <ul className="divide-y divide-[#EEF3F6] overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
              {guide.questions.map((question) => (
                <li key={question.title}>
                  <Link href="/questions" className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-[#F8FBFD]">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-6 text-[#174C73]">{question.title}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {question.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-[#F1F5F8] px-2 py-0.5 text-[11px] text-[#557086]">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </span>
                    {question.answers > 0 ? (
                      <span className="shrink-0 text-xs text-[#6B8498]">回答 {question.answers}件</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#FFF4E8] px-2.5 py-1 text-[11px] font-semibold text-[#B45309]">
                        回答募集中
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link href="/questions" className="flex items-center gap-1 text-sm text-[#1478B8] hover:text-[#0D5686]">
                Q&Aをすべて見る（{guide.counts.questions}件）
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/questions/new"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1478B8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5686]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                このページにない疑問を質問する
              </Link>
            </div>
          </section>

          <section>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle
                id="links"
                icon={BookMarked}
                title="公式・参考情報"
                description="最新の内容はリンク先で確認してください"
              />
              <span className="mt-1 shrink-0">
                <SourceBadge kind="official" />
              </span>
            </div>
            <div className="space-y-5">
              {guide.links.map((group) => (
                <div key={group.group}>
                  <h3 className="mb-2 text-xs font-bold text-[#406783]">{group.group}</h3>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {group.items.map((item) => {
                      const body = (
                        <>
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-6 text-[#174C73]">{item.name}</span>
                            {item.url && <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[#7F9AAD]" />}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#648198]">{item.note}</span>
                          {item.url && (
                            <span className="mt-1.5 block text-[11px] text-[#7F95A6]">{hostOf(item.url)}</span>
                          )}
                        </>
                      );
                      return (
                        <li key={item.name}>
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block h-full rounded-xl border border-[#E1EBF1] bg-white px-4 py-3 transition hover:border-[#9EC6DF]"
                            >
                              {body}
                            </a>
                          ) : (
                            <div className="h-full rounded-xl border border-dashed border-[#DCE6EC] bg-white px-4 py-3">
                              {body}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[#7F95A6]">
              リンク先の内容は、各機関・学校が発信しているものです。Atlasが内容を保証したり、特定の学校をすすめたりするものではありません。
            </p>
          </section>

          <section>
            <SectionTitle
              id="nearby"
              icon={UsersRound}
              title="この地域で役立つこと"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-[#1478B8]" />
                  <h3 className="text-sm font-bold text-[#174C73]">譲ります</h3>
                  <span className="text-[11px] text-[#7F95A6]">学校・勉強に関係するもの</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {guide.giveaways.map((item) => (
                    <li key={item.title}>
                      <Link
                        href="/giveaways"
                        className="flex items-center justify-between gap-2 rounded-lg bg-[#F8FBFD] px-3 py-2 text-sm text-[#174C73] hover:bg-[#F1F8FC]"
                      >
                        <span className="truncate">{item.title}</span>
                        <span className="shrink-0 text-[11px] text-[#7F95A6]">{item.place}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/giveaways" className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#1478B8]">
                  グルガオンの「譲る」を見る
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-[#1478B8]" />
                  <h3 className="text-sm font-bold text-[#174C73]">集まる・つながる</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {guide.gathers.map((item) => (
                    <li key={item.title}>
                      <Link href="/gather" className="block rounded-lg bg-[#F8FBFD] px-3 py-2 hover:bg-[#F1F8FC]">
                        <span className="text-[11px] text-[#7F95A6]">{item.date}</span>
                        <span className="block text-sm text-[#174C73]">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-[#648198]">
                  同じ学校を検討している人や、通わせている人と直接話せる場があります。
                </p>
                <Link href="/gather" className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#1478B8]">
                  グルガオンの集まりを見る
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* ほかのトピックと、情報を足す入口 */}
          <section className="rounded-2xl border border-[#DCEAF2] bg-white p-5">
            <h2 className="text-sm font-bold text-[#174C73]">グルガオンの「学校・教育」のほかのページ</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.otherTopics.map((topic) => (
                <span
                  key={topic.title}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs ${
                    topic.current
                      ? 'border-[#1478B8] bg-[#1478B8] text-white'
                      : topic.count > 0
                        ? 'border-[#D8E7F0] bg-white text-[#35617E]'
                        : 'border-dashed border-[#DCE6EC] bg-[#F8FBFD] text-[#8AA0B0]'
                  }`}
                >
                  {topic.title}
                  {!topic.current && <span className="text-[10px] opacity-80">{topic.count > 0 ? `${topic.count}件` : '情報募集中'}</span>}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#EEF3F6] pt-4 text-xs text-[#6B8498] sm:flex-row sm:items-center sm:justify-between">
              <p>このページの情報が古い・間違っている場合は、教えてください。</p>
              <Link href="/contact" className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#1478B8]">
                <Flag className="h-3.5 w-3.5" />
                情報の修正を伝える
              </Link>
            </div>
          </section>
        </div>

        {/* PC用の目次とAI検索 */}
        <aside className="hidden lg:block">
          <div className="sticky top-[96px] space-y-4">
            <nav className="rounded-2xl border border-[#E1EBF1] bg-white p-4" aria-label="目次">
              <p className="mb-2 text-xs font-bold text-[#406783]">このページの内容</p>
              <ul className="space-y-0.5">
                {toc.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-lg px-2 py-1.5 text-sm text-[#35617E] transition hover:bg-[#F1F8FC] hover:text-[#1478B8]"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <AiSearchTeaser />
          </div>
        </aside>
      </div>

      <div className="mt-8 lg:hidden">
        <AiSearchTeaser />
      </div>
    </main>
  );
}

function AiSearchTeaser() {
  return (
    <div className="rounded-2xl border border-dashed border-[#CFDDE6] bg-[#F4F8FA] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <WandSparkles className="h-4 w-4 text-[#7F9AAD]" />
        <p className="text-sm font-semibold text-[#4F6B80]">このページについてAIに聞く</p>
        <span className="rounded-full bg-[#E4ECF1] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#6B8498]">
          Coming Soon
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#7F95A6]">
        このページの経験談と公式情報をもとに、答えます。回答には必ず出典を付け、学校を選ぶことはしません。
      </p>
      <div className="mt-3 space-y-1.5">
        {['小2で英語が話せない場合の経験談は？', '日本人学校のバスについての情報をまとめて'].map((example) => (
          <p key={example} className="rounded-lg border border-[#DCE6EC] bg-white px-3 py-2 text-xs text-[#8AA0B0]">
            {example}
          </p>
        ))}
      </div>
    </div>
  );
}
