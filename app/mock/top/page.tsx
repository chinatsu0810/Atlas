import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const patterns = [
  {
    href: '/mock/top/a',
    name: 'A 検索する',
    first: '国つきの検索窓',
    fits: '「何を知りたいか」が決まっている人',
  },
  {
    href: '/mock/top/b',
    name: 'B 行き先から',
    first: '国 → 地域 → テーマ を選ぶだけ',
    fits: '「まず自分の国の情報を見たい」人',
  },
  {
    href: '/mock/top/c',
    name: 'C いまの状況から',
    first: '行く前／着いたばかり／暮らしている／帰る前',
    fits: '「何を調べればいいか分からない」人',
  },
];

export default function MockTopIndex() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-10 md:px-6">
      <h1 className="text-xl font-bold text-[#123B5D]">トップページ案</h1>
      <p className="mt-1 text-sm text-[#668096]">3つとも、新着・行き先・公式情報は共通。違うのはファーストビューの入口です。</p>

      <ul className="mt-6 space-y-3">
        {patterns.map((pattern) => (
          <li key={pattern.href}>
            <Link
              href={pattern.href}
              className="group flex items-center gap-4 rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-[#174C73]">{pattern.name}</span>
                <span className="mt-1 block text-sm text-[#406783]">入口：{pattern.first}</span>
                <span className="mt-0.5 block text-xs text-[#7F95A6]">向いている人：{pattern.fits}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#4E9BC5] transition group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-[#7F95A6]">
        今のトップは <Link href="/" className="text-[#1478B8] underline">こちら</Link>。
        国・地域・テーマのページは <Link href="/mock/hub/india/gurgaon/education" className="text-[#1478B8] underline">情報ハブのモック</Link> につながっています。
      </p>
    </main>
  );
}
