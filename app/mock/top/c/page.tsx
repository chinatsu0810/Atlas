import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COUNTRIES } from '../../hub/_data';
import { FeedList, loadFeed } from '../_feed';
import { PlaceSearch } from '../_search';
import { StagePicker } from './_stages';

const majorCountries = ['india', 'china', 'singapore', 'thailand', 'usa', 'uk', 'australia', 'germany'];

export default async function MockTopC() {
  const feed = await loadFeed();

  return (
    <>
      <section className="bg-gradient-to-b from-[#FFF7EF] to-[#F8FBFD]">
        <div className="mx-auto max-w-[760px] px-4 pb-8 pt-7 md:pb-12 md:pt-14">
          <h1 className="text-2xl font-bold text-[#123B5D] md:text-4xl">いま、どんなとき？</h1>
          <p className="mt-2 text-xs text-[#557086] md:text-sm">海外生活の「困った」に、先に経験した人の話と公式情報で。</p>

          <div className="mt-5">
            <StagePicker />
          </div>

          <div className="mt-4">
            <PlaceSearch size="md" placeholder="ほかのことを探す" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1120px] px-4 pb-14 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <section className="pt-4">
            <h2 className="mb-3 text-sm font-bold text-[#174C73] md:text-base">最近Atlasに届いたこと</h2>
            <FeedList items={feed} />
          </section>

          <section className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#174C73] md:text-base">行き先から</h2>
              <Link href="/mock/hub" className="flex items-center gap-1 text-xs text-[#1478B8]">
                すべて
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {majorCountries.map((slug) => {
                const country = COUNTRIES.find((item) => item.slug === slug)!;
                return (
                  <Link
                    key={slug}
                    href={`/mock/hub/${slug}`}
                    className="rounded-full border border-[#D8E7F0] bg-white px-3.5 py-1.5 text-sm text-[#35617E] transition hover:border-[#9EC6DF] hover:bg-[#F1F8FC]"
                  >
                    {country.name}
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
