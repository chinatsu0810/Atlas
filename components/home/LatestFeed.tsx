import Link from 'next/link';
import { ArrowRight, CalendarDays, Gift, MessageCircle, NotebookPen } from 'lucide-react';
import type { FeedItem } from '@/lib/home/feed';

const KIND = {
  experience: { label: '経験談', icon: NotebookPen, className: 'bg-[#E8F5F3] text-[#1F5F5B]' },
  question: { label: '質問', icon: MessageCircle, className: 'bg-[#FFF4E8] text-[#B45309]' },
  giveaway: { label: '譲ります', icon: Gift, className: 'bg-[#FDF0F4] text-[#B4436B]' },
  gather: { label: 'イベント', icon: CalendarDays, className: 'bg-[#EAF4FB] text-[#1478B8]' },
};

export function LatestFeed({ items, limit = 8 }: { items: FeedItem[]; limit?: number }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center text-sm text-[#678096]">
        まだ投稿はありません。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#EEF3F6] overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
      {items.slice(0, limit).map((item) => {
        const { label, icon: Icon, className } = KIND[item.kind];

        return (
          <li key={`${item.kind}-${item.id}`}>
            <Link href={item.href} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[#F8FBFD]">
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[#174C73] group-hover:text-[#1478B8]">{item.title}</span>
                <span className="block text-[11px] text-[#7F95A6]">
                  {item.place}・{item.meta}
                </span>
              </span>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-[#9EC6DF] sm:block" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
