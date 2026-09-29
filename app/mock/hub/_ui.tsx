import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Baby,
  Briefcase,
  Car,
  ChevronRight,
  Ellipsis,
  FileText,
  Gift,
  GraduationCap,
  House,
  Landmark,
  Layers,
  MessageCircle,
  NotebookPen,
  Plane,
  ShoppingBasket,
  Sofa,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react';
import { SOURCE_LABELS, type Fact, type SourceKind, type ThemeKey } from './_data';

export const HUB_ROOT = '/mock/hub';

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
  giveaway: Gift,
  other: Ellipsis,
};

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

// 国旗の絵文字は Windows で表示されないため、国コードを控えめなバッジで出す
export function CountryCode({ code, size = 'md' }: { code: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[#EAF4FB] font-bold tracking-wide text-[#1478B8] ${
        size === 'lg' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-[11px]'
      }`}
    >
      {code}
    </span>
  );
}

const SOURCE_STYLES: Record<SourceKind, { icon: LucideIcon; className: string }> = {
  official: { icon: Landmark, className: 'bg-[#EAF4FB] text-[#1478B8]' },
  experience: { icon: NotebookPen, className: 'bg-[#E8F5F3] text-[#1F5F5B]' },
  qa: { icon: MessageCircle, className: 'bg-[#FFF4E8] text-[#B45309]' },
  atlas: { icon: Layers, className: 'bg-[#F1F5F8] text-[#53616B]' },
};

export function SourceBadge({ kind }: { kind: SourceKind }) {
  const { icon: Icon, className } = SOURCE_STYLES[kind];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      <Icon className="h-3 w-3" />
      {SOURCE_LABELS[kind].label}
    </span>
  );
}

// 1つの情報と、その出どころ
export function FactItem({ fact }: { fact: Fact }) {
  return (
    <li className="rounded-xl border border-[#E8EEF2] bg-white px-4 py-3">
      <p className="text-sm leading-7 text-[#29465C]">{fact.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SourceBadge kind={fact.source} />
        <span className="text-[11px] text-[#7F95A6]">出典：{fact.cite}</span>
      </div>
    </li>
  );
}

export function SourceLegend() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(SOURCE_LABELS) as SourceKind[]).map((kind) => (
        <div key={kind} className="flex items-start gap-2">
          <SourceBadge kind={kind} />
          <p className="text-xs leading-5 text-[#6B8498]">{SOURCE_LABELS[kind].description}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({
  id,
  title,
  description,
  icon: Icon,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div id={id} className="mb-4 scroll-mt-28">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-[#1478B8]" />}
        <h2 className="text-base font-bold text-[#123B5D] md:text-lg">{title}</h2>
      </div>
      {description && <p className="mt-1 text-xs leading-5 text-[#6B8498] md:text-sm">{description}</p>}
    </div>
  );
}

// 情報量は数字を強調せず、控えめな文字で添える
export function AmountLabel({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-[11px] text-[#A3B1BB]">情報募集中</span>;
  }
  return <span className="text-[11px] text-[#7F95A6]">情報 {count}件</span>;
}
