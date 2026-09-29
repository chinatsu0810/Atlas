import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Gift, MapPin, MessageCircle, PenLine, UsersRound } from 'lucide-react';
import { THEMES, findCountry, findRegion, themeStatus } from '../../_data';
import { AmountLabel, Breadcrumb, HUB_ROOT, THEME_ICONS } from '../../_ui';

type Props = { params: Promise<{ country: string; region: string }> };

export default async function MockRegionPage({ params }: Props) {
  const { country: countrySlug, region: regionSlug } = await params;
  const country = findCountry(countrySlug);
  const region = country && findRegion(country, regionSlug);
  if (!country || !region) notFound();

  const base = `${HUB_ROOT}/${country.slug}/${region.slug}`;
  // 「譲る」はテーマ一覧には並べず、地域で使える機能として下に出す
  const themes = THEMES.filter((theme) => theme.key !== 'giveaway');
  const withInfo = themes
    .filter((theme) => region.themes[theme.key])
    .sort((a, b) => (region.themes[b.key] ?? 0) - (region.themes[a.key] ?? 0));
  const collecting = themes.filter((theme) => !region.themes[theme.key]);
  const giveawayCount = region.themes.giveaway ?? 0;

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-14 pt-6 md:px-6">
      <Breadcrumb
        items={[
          { label: '情報ハブ', href: HUB_ROOT },
          { label: country.name, href: `${HUB_ROOT}/${country.slug}` },
          { label: region.name },
        ]}
      />

      <div className="flex items-center gap-2">
        <MapPin className="h-6 w-6 text-[#1478B8]" />
        <h1 className="text-2xl font-bold text-[#123B5D]">{region.name}</h1>
      </div>
      <p className="mt-2 text-sm text-[#668096]">
        {region.note ? `${region.note}。` : ''}何について調べますか？
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">テーマを選ぶ</h2>

        {withInfo.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center text-sm text-[#678096]">
            この地域の情報は、まだ集まっていません。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {withInfo.map((theme) => {
              const Icon = THEME_ICONS[theme.key];
              const count = region.themes[theme.key] ?? 0;
              const rich = themeStatus(count) === 'rich';

              return (
                <Link
                  key={theme.key}
                  href={`${base}/${theme.key}`}
                  className={`group flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                    rich ? 'border-[#C9DFEA] border-t-4 border-t-[#8CC5E4]' : 'border-[#E1EBF1]'
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4FB] text-[#1478B8]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-[#174C73]">{theme.label}</h3>
                  <p className="mt-1 flex-1 text-[11px] leading-5 text-[#6D8496] sm:text-xs">{theme.hint}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <AmountLabel count={count} />
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
            <p className="mt-0.5 text-[11px] text-[#7F95A6]">
              公式情報へのリンクは見られます。経験談や質問が集まると、ページが育っていきます。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {collecting.map((theme) => {
                const Icon = THEME_ICONS[theme.key];
                return (
                  <Link
                    key={theme.key}
                    href={`${base}/${theme.key}`}
                    className="flex items-center gap-1.5 rounded-full border border-[#DCE6EC] bg-white px-3 py-1.5 text-xs text-[#6B8498] transition hover:border-[#9EC6DF] hover:text-[#1478B8]"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {theme.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">{region.name}で使えること</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/giveaways"
            className="group rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-[#1478B8]" />
              <h3 className="text-sm font-bold text-[#174C73]">譲る</h3>
              <span className="ml-auto">
                <AmountLabel count={giveawayCount} />
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#648198]">
              帰任・引越しで手放すものを、この地域で次に暮らす人へ。
            </p>
          </Link>
          <Link
            href="/gather"
            className="group rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-[#1478B8]" />
              <h3 className="text-sm font-bold text-[#174C73]">集まる・つながる</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#648198]">この地域で、日本語で参加できる集まりやイベント。</p>
          </Link>
          <div className="rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm">
            <p className="text-xs leading-5 text-[#648198]">{region.name}について、知っていることはありますか？</p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/experiences/new"
                className="inline-flex items-center gap-1 rounded-full bg-[#1478B8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D5686]"
              >
                <PenLine className="h-3.5 w-3.5" />
                経験談を書く
              </Link>
              <Link
                href="/questions/new"
                className="inline-flex items-center gap-1 rounded-full border border-[#9EC6DF] px-3.5 py-2 text-xs font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                質問する
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
