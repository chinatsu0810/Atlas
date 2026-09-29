import Link from 'next/link';
import { Search } from 'lucide-react';
import { FeedList, loadFeed } from '../_feed';
import { DestinationPicker } from './_destination';

export default async function MockTopB() {
  const feed = await loadFeed();

  return (
    <>
      <section className="bg-gradient-to-b from-[#EFFAF7] to-[#F8FBFD]">
        <div className="mx-auto max-w-[860px] px-4 pb-8 pt-7 md:pb-12 md:pt-14">
          <h1 className="text-2xl font-bold text-[#123B5D] md:text-4xl">どこの暮らしを調べますか？</h1>
          <p className="mt-2 text-xs text-[#557086] md:text-sm">住んでいる国、これから行く国を選んでください。</p>

          <div className="mt-5">
            <DestinationPicker />
          </div>

          <form action="/search" method="get" className="mt-3 flex items-center gap-2 px-1">
            <Search className="h-4 w-4 shrink-0 text-[#7F9AAD]" />
            <input
              type="search"
              name="q"
              placeholder="言葉で探す（例：インド 病院）"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#123B5D] outline-none placeholder:text-[#8AA0B0]"
            />
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-[860px] px-4 pb-14 md:px-6">
        <section className="pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#174C73] md:text-base">最近Atlasに届いたこと</h2>
            <Link href="/search" className="text-xs text-[#1478B8] md:text-sm">
              もっと見る
            </Link>
          </div>
          <FeedList items={feed} />
        </section>
      </main>
    </>
  );
}
