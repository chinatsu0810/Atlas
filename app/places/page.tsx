import type { Metadata } from 'next';
import Link from 'next/link';
import { AREAS, PLACES } from '@/lib/places/data';
import { Breadcrumb, Flag } from '@/components/places/ui';

export const metadata: Metadata = {
  title: '国から探す｜Atlas',
  description: '国・地域ごとに、海外生活の経験談・Q&A・公式情報を探せます。',
  alternates: { canonical: '/places' },
};

// 国が多いので、地方ごとに見出しを付けて並べる
export default function PlacesPage() {
  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 pb-14 pt-6 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: '国から探す' }]} />
        <h1 className="text-2xl font-bold">国から探す</h1>

        {AREAS.map((area) => {
          const places = PLACES.filter((place) => place.area === area.key);
          if (places.length === 0) return null;
          return (
            <section key={area.key} className="mt-8">
              <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">{area.label}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {places.map((place) => (
                  <Link
                    key={place.slug}
                    href={`/places/${place.slug}`}
                    className="flex min-h-12 items-center gap-2.5 rounded-xl border border-[#E1EBF1] bg-white px-3 py-2.5 transition hover:border-[#9EC6DF] hover:shadow-sm"
                  >
                    <Flag flag={place.flag} size={32} />
                    <span className="text-sm font-medium text-[#174C73]">{place.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
