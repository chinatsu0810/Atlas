'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical } from 'lucide-react';

const patterns = [
  { href: '/mock/top/a', label: 'A 検索する' },
  { href: '/mock/top/b', label: 'B 行き先から' },
  { href: '/mock/top/c', label: 'C いまの状況から' },
];

// モックの切り替え。本番のページには入れない
export function PatternSwitcher() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[#F5D9A8] bg-[#FFFBF2]">
      <div className="mx-auto flex max-w-[1120px] items-center gap-2 overflow-x-auto px-4 py-1.5 md:px-6">
        <Link href="/mock/top" className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#8A5A12]">
          <FlaskConical className="h-3.5 w-3.5" />
          トップ案
        </Link>
        {patterns.map((pattern) => (
          <Link
            key={pattern.href}
            href={pattern.href}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              pathname === pattern.href ? 'bg-[#8A5A12] text-white' : 'text-[#8A5A12] hover:bg-[#FCEBC8]'
            }`}
          >
            {pattern.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
