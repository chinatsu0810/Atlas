'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

type Via = '経験談・Q&A' | '質問する' | '経験を書く' | '譲る' | '集まる' | '公式情報';

type Need = { label: string; href: string; via: Via };

const VIA_STYLE: Record<Via, string> = {
  '経験談・Q&A': 'bg-[#E8F5F3] text-[#1F5F5B]',
  質問する: 'bg-[#FFF4E8] text-[#B45309]',
  経験を書く: 'bg-[#E8F5F3] text-[#1F5F5B]',
  譲る: 'bg-[#FDF0F4] text-[#B4436B]',
  集まる: 'bg-[#EAF4FB] text-[#1478B8]',
  公式情報: 'bg-[#F1F5F8] text-[#53616B]',
};

const search = (q: string) => `/search?q=${encodeURIComponent(q)}`;

// 海外生活の段階ごとに、よくある用事と、それを叶える Atlas の機能を並べる
const stages: { key: string; label: string; needs: Need[] }[] = [
  {
    key: 'before',
    label: '行く前',
    needs: [
      { label: '子どもの学校を決めたい', href: '/mock/hub/india/gurgaon/education', via: '経験談・Q&A' },
      { label: '住むエリアの目星をつけたい', href: search('住まい'), via: '経験談・Q&A' },
      { label: 'ビザや手続きを知りたい', href: search('ビザ'), via: '経験談・Q&A' },
      { label: '持っていくもの・いらないもの', href: search('持ち物'), via: '経験談・Q&A' },
      { label: '行った人に聞いてみたい', href: '/questions/new', via: '質問する' },
    ],
  },
  {
    key: 'arrived',
    label: '着いたばかり',
    needs: [
      { label: '病院を見つけておきたい', href: search('病院'), via: '経験談・Q&A' },
      { label: '家具や生活用品をそろえたい', href: '/giveaways', via: '譲る' },
      { label: '日本人の知り合いがほしい', href: '/gather', via: '集まる' },
      { label: '在留届を出す', href: 'https://www.ezairyu.mofa.go.jp/', via: '公式情報' },
      { label: '困ったことを聞きたい', href: '/questions/new', via: '質問する' },
    ],
  },
  {
    key: 'living',
    label: '暮らしている',
    needs: [
      { label: '週末に参加できる集まり', href: '/gather', via: '集まる' },
      { label: '同じ国の人の経験を読みたい', href: '/experiences', via: '経験談・Q&A' },
      { label: '誰かの質問に答えたい', href: '/questions', via: '質問する' },
      { label: '自分の経験を残したい', href: '/experiences/new', via: '経験を書く' },
      { label: '治安・安全の最新情報', href: 'https://www.anzen.mofa.go.jp/', via: '公式情報' },
    ],
  },
  {
    key: 'leaving',
    label: '帰る前・帰った後',
    needs: [
      { label: '家具や子ども用品を譲りたい', href: '/giveaways/new', via: '譲る' },
      { label: '帰国後の学校・手続き', href: search('帰国'), via: '経験談・Q&A' },
      { label: 'この国での経験を残したい', href: '/experiences/new', via: '経験を書く' },
      { label: '帰国した人の話を読みたい', href: search('帰国済み'), via: '経験談・Q&A' },
    ],
  },
];

export function StagePicker() {
  const [active, setActive] = useState('before');
  const stage = stages.find((item) => item.key === active)!;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#C9DFEA] bg-white shadow-[0_14px_36px_rgba(20,73,107,0.12)]">
      <div role="tablist" className="grid grid-cols-4 border-b border-[#E1EBF1] bg-[#F8FBFD]">
        {stages.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={item.key === active}
            onClick={() => setActive(item.key)}
            className={`border-b-2 px-1 py-3 text-xs font-semibold transition md:text-sm ${
              item.key === active
                ? 'border-[#1478B8] bg-white text-[#1478B8]'
                : 'border-transparent text-[#6B8498] hover:text-[#1478B8]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul role="tabpanel" className="divide-y divide-[#EEF3F6]">
        {stage.needs.map((need) => {
          const external = need.href.startsWith('http');
          const content = (
            <>
              <span className="min-w-0 flex-1 text-sm font-medium text-[#174C73] group-hover:text-[#1478B8] md:text-base">
                {need.label}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold md:text-[11px] ${VIA_STYLE[need.via]}`}>
                {need.via}
              </span>
              {external ? (
                <ExternalLink className="h-4 w-4 shrink-0 text-[#9EC6DF]" />
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 text-[#9EC6DF] transition group-hover:translate-x-0.5" />
              )}
            </>
          );
          const className = 'group flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#F8FBFD] md:px-5';

          return (
            <li key={need.label}>
              {external ? (
                <a href={need.href} target="_blank" rel="noopener noreferrer" className={className}>
                  {content}
                </a>
              ) : (
                <Link href={need.href} className={className}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
