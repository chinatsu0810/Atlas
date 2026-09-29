import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookMarked, ExternalLink, MessageCircle, NotebookPen, PenLine, Sprout } from 'lucide-react';
import {
  GENERIC_SAMPLES,
  findCountry,
  findRegion,
  findTheme,
  regionShortName,
  themeStatus,
  type Country,
} from '../../../_data';
import { SchoolGuide } from '../../../_school-guide';
import { AmountLabel, Breadcrumb, HUB_ROOT, SectionTitle, SourceBadge, THEME_ICONS } from '../../../_ui';

type Props = { params: Promise<{ country: string; region: string; theme: string }> };

// 情報が少ないページでも、公的機関のリンクだけは必ず出せる
function officialLinks(country: Country) {
  return [
    {
      name: '外務省 海外安全ホームページ',
      url: 'https://www.anzen.mofa.go.jp/',
      note: `${country.name}の安全情報`,
    },
    country.slug === 'india'
      ? { name: '在インド日本国大使館', url: 'https://www.in.emb-japan.go.jp/', note: '在留届・各種手続き・お知らせ' }
      : { name: `在${country.name}日本国大使館（サンプル）`, url: '', note: 'モックのためリンクは未設定' },
  ];
}

export default async function MockThemePage({ params }: Props) {
  const { country: countrySlug, region: regionSlug, theme: themeKey } = await params;
  const country = findCountry(countrySlug);
  const region = country && findRegion(country, regionSlug);
  const theme = findTheme(themeKey);
  if (!country || !region || !theme) notFound();

  // 作り込んでいるのは「グルガオンの学校選び」だけ
  if (country.slug === 'india' && region.slug === 'gurgaon' && theme.key === 'education') {
    return <SchoolGuide country={country} region={region} />;
  }

  const Icon = THEME_ICONS[theme.key];
  const count = region.themes[theme.key] ?? 0;
  const status = themeStatus(count);
  const samples = status === 'collecting' ? undefined : GENERIC_SAMPLES[theme.key];
  const base = `${HUB_ROOT}/${country.slug}/${region.slug}`;
  const title = `${regionShortName(region)}の${theme.label}`;

  return (
    <main className="mx-auto max-w-[880px] px-4 pb-14 pt-6 md:px-6">
      <Breadcrumb
        items={[
          { label: '情報ハブ', href: HUB_ROOT },
          { label: country.name, href: `${HUB_ROOT}/${country.slug}` },
          { label: region.name, href: base },
          { label: theme.label },
        ]}
      />

      <header className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm md:p-7">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1478B8]">
          <Icon className="h-4 w-4" />
          {theme.label}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#123B5D]">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-[#406783]">{theme.hint}について、集まっている情報です。</p>
        <p className="mt-2">
          <AmountLabel count={count} />
        </p>
      </header>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-[#C9DDE9] bg-[#F4FBF8] px-4 py-4">
        <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-[#1F5F5B]" />
        <div className="text-sm leading-6 text-[#406783]">
          {status === 'collecting' ? (
            <p>
              このテーマは、いま情報を集めているところです。まずは公式情報を見ることができます。
              経験談や質問が集まると、このページに整理されていきます。
            </p>
          ) : (
            <p>
              このページは、まだ整理の途中です。経験談とQ&Aがもう少し集まると、
              「まず知っておきたいこと」などの形にまとめていきます。
            </p>
          )}
          {region.slug === 'gurgaon' && (
            <Link
              href={`${base}/education`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1478B8]"
            >
              整理が進んだページの例：グルガオンの学校選び
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-10">
        <section>
          <div className="flex items-start justify-between gap-4">
            <SectionTitle icon={NotebookPen} title="実際に経験した人の話" />
            <SourceBadge kind="experience" />
          </div>
          {samples && samples.experiences.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {samples.experiences.map((experienceTitle) => (
                <li
                  key={experienceTitle}
                  className="rounded-xl border border-[#E1EBF1] border-t-4 border-t-[#8CC5E4] bg-white p-4 text-sm font-bold leading-6 text-[#174C73] shadow-sm"
                >
                  {experienceTitle}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInvite text={`${title}についての経験談は、まだありません。`} href="/experiences/new" label="最初の経験談を書く" />
          )}
        </section>

        <section>
          <div className="flex items-start justify-between gap-4">
            <SectionTitle icon={MessageCircle} title="Q&A" />
            <SourceBadge kind="qa" />
          </div>
          {samples && samples.questions.length > 0 ? (
            <ul className="divide-y divide-[#EEF3F6] overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
              {samples.questions.map((question) => (
                <li key={question} className="px-4 py-3.5 text-sm text-[#174C73]">
                  {question}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInvite text="まだ質問はありません。知りたいことを聞いてみませんか？" href="/questions/new" label="質問する" />
          )}
        </section>

        <section>
          <div className="flex items-start justify-between gap-4">
            <SectionTitle icon={BookMarked} title="公式・参考情報" />
            <SourceBadge kind="official" />
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {officialLinks(country).map((link) =>
              link.url ? (
                <li key={link.name}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full rounded-xl border border-[#E1EBF1] bg-white px-4 py-3 transition hover:border-[#9EC6DF]"
                  >
                    <span className="flex items-start justify-between gap-2 text-sm font-semibold text-[#174C73]">
                      {link.name}
                      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[#7F9AAD]" />
                    </span>
                    <span className="mt-0.5 block text-xs text-[#648198]">{link.note}</span>
                  </a>
                </li>
              ) : (
                <li key={link.name} className="rounded-xl border border-dashed border-[#DCE6EC] bg-white px-4 py-3">
                  <span className="text-sm font-semibold text-[#174C73]">{link.name}</span>
                  <span className="mt-0.5 block text-xs text-[#648198]">{link.note}</span>
                </li>
              ),
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

function EmptyInvite({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center">
      <p className="text-sm text-[#678096]">{text}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#9EC6DF] px-4 py-2 text-xs font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
      >
        <PenLine className="h-3.5 w-3.5" />
        {label}
      </Link>
    </div>
  );
}
