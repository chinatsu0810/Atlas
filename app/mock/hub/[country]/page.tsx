import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { THEMES, findCountry, regionTotal } from '../_data';
import { AmountLabel, Breadcrumb, CountryCode, HUB_ROOT, THEME_ICONS } from '../_ui';

type Props = { params: Promise<{ country: string }> };

export default async function MockCountryPage({ params }: Props) {
  const { country: countrySlug } = await params;
  const country = findCountry(countrySlug);
  if (!country) notFound();

  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-14 pt-6 md:px-6">
      <Breadcrumb items={[{ label: '情報ハブ', href: HUB_ROOT }, { label: country.name }]} />

      <div className="flex items-center gap-3">
        <CountryCode code={country.code} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-[#123B5D]">{country.name}</h1>
          <p className="text-sm text-[#668096]">{country.name}での海外生活に役立つ情報</p>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#406783]">{country.lead}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">地域を選ぶ</h2>

        <div className="grid gap-3 md:grid-cols-2">
          {country.regions.map((region) => {
            const total = regionTotal(region);
            // その地域で情報が多いテーマを、中身の予告として3つまで見せる
            const topThemes = THEMES.filter((theme) => region.themes[theme.key])
              .sort((a, b) => (region.themes[b.key] ?? 0) - (region.themes[a.key] ?? 0))
              .slice(0, 3);

            return (
              <Link
                key={region.slug}
                href={`${HUB_ROOT}/${country.slug}/${region.slug}`}
                className="group flex flex-col rounded-2xl border border-[#E1EBF1] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9EC6DF] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-[#1478B8]" />
                    <h3 className="text-base font-bold text-[#174C73]">{region.name}</h3>
                  </div>
                  <AmountLabel count={total} />
                </div>
                {region.note && <p className="mt-1.5 pl-6 text-xs text-[#6D8496]">{region.note}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-1.5 pl-6">
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
          <p>探している地域がありませんか？ 質問すると、その地域のページができるきっかけになります。</p>
          <Link
            href="/questions/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#9EC6DF] px-4 py-2 text-xs font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {country.name}について質問する
          </Link>
        </div>
      </section>
    </main>
  );
}
