import Link from 'next/link';
import { AREAS, COUNTRIES } from './_data';
import { Breadcrumb, HUB_ROOT } from './_ui';

export default function MockHubTopPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 pb-14 pt-6 md:px-6">
      <Breadcrumb items={[{ label: 'トップ', href: '/mock/top' }, { label: '国を選ぶ' }]} />
      <h1 className="text-2xl font-bold text-[#123B5D]">国を選ぶ</h1>

      <div className="mt-6 space-y-6">
        {AREAS.map((area) => (
          <section key={area}>
            <h2 className="mb-2 text-xs font-bold text-[#406783]">{area}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {COUNTRIES.filter((country) => country.area === area).map((country) => (
                <Link
                  key={country.slug}
                  href={`${HUB_ROOT}/${country.slug}`}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E1EBF1] bg-white px-3 py-2.5 transition hover:border-[#9EC6DF] hover:shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF4FB] text-[10px] font-bold text-[#1478B8]">
                    {country.code}
                  </span>
                  <span className="text-sm font-medium text-[#174C73]">{country.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
