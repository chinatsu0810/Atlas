import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import {
  Baby,
  Briefcase,
  Car,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  House,
  PackageOpen,
  Plane,
  ShoppingBasket,
  Sofa,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react';
import type { ThemeKey } from '@/lib/places/data';
import type { OfficialLink } from '@/lib/places/links';
import type { PlacePost } from '@/lib/places/queries';

export const THEME_ICONS: Record<ThemeKey, LucideIcon> = {
  education: GraduationCap,
  housing: House,
  medical: Stethoscope,
  living: Sofa,
  transport: Car,
  childcare: Baby,
  work: Briefcase,
  visa: FileText,
  shopping: ShoppingBasket,
  food: UtensilsCrossed,
  travel: Plane,
  moving: PackageOpen,
};

export function Flag({ flag, size = 36 }: { flag: string | null; size?: number }) {
  if (!flag) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-[#EAF4FB] text-[#1478B8]"
        style={{ width: size, height: size }}
      >
        <Globe className="h-1/2 w-1/2" />
      </span>
    );
  }

  return (
    <Image
      src={`/flags/${flag}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full object-cover ring-1 ring-[#E1EBF1]"
      style={{ width: size, height: size }}
    />
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="現在地" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-[#6B8498] md:text-sm">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#A3B1BB]" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-[#1478B8] hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-[#174C73]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// 件数は強調せず、控えめな文字で添える
export function AmountLabel({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-[11px] text-[#A3B1BB]">情報募集中</span>;
  }
  return <span className="text-[11px] text-[#7F95A6]">{count}件</span>;
}

export function SectionTitle({
  icon: Icon,
  title,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#1478B8]" />
        <h2 className="text-base font-bold text-[#123B5D] md:text-lg">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function ExperienceCards({ posts }: { posts: PlacePost[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/experiences/${post.id}`}
          className="flex flex-col rounded-xl border border-[#E1EBF1] border-t-4 border-t-[#8CC5E4] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          {post.tagNames.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {post.tagNames.slice(0, 3).map((name) => (
                <span key={name} className="rounded-full bg-[#F1F5F8] px-2.5 py-1 text-xs text-[#557086]">
                  {name}
                </span>
              ))}
            </div>
          )}
          <h3 className="line-clamp-2 text-sm font-bold leading-6 text-[#174C73]">{post.title}</h3>
          <p className="mt-2 line-clamp-3 flex-1 text-xs leading-5 text-[#6D8496]">{post.content}</p>
          <div className="mt-3 flex items-center gap-1 border-t border-[#E8EEF2] pt-3 text-xs text-[#7890A2]">
            <CircleUserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{post.author}</span>
            <span>・</span>
            <span className="shrink-0">{new Date(post.createdAt).toLocaleDateString('ja-JP')}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function QuestionList({ posts }: { posts: PlacePost[] }) {
  return (
    <ul className="divide-y divide-[#EEF3F6] overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
      {posts.map((post) => (
        <li key={post.id}>
          <Link href={`/questions/${post.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-[#F8FBFD]">
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm leading-6 text-[#174C73]">{post.title}</span>
              <span className="mt-0.5 block text-[11px] text-[#7F95A6]">
                {new Date(post.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </span>
            {post.answerCount > 0 ? (
              <span className="shrink-0 text-xs text-[#6B8498]">回答 {post.answerCount}件</span>
            ) : (
              <span className="shrink-0 rounded-full bg-[#FFF4E8] px-2.5 py-1 text-[11px] font-semibold text-[#B45309]">
                回答募集中
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OfficialLinks({ links }: { links: OfficialLink[] }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full items-center gap-2 rounded-xl border border-[#E1EBF1] bg-white px-4 py-3 transition hover:border-[#9EC6DF]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#174C73]">{link.name}</span>
              <span className="text-[11px] text-[#7F95A6]">{link.owner}</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9EC6DF]" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function EmptyInvite({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#C9DDE9] bg-white px-4 py-8 text-center">
      <p className="text-sm text-[#678096]">{text}</p>
      <Link
        href={href}
        className="inline-flex h-10 items-center rounded-full border border-[#9EC6DF] px-5 text-sm font-semibold text-[#1478B8] hover:bg-[#F1F8FC]"
      >
        {label}
      </Link>
    </div>
  );
}
