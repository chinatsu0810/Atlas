'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CircleHelp,
  Home,
  PenLine,
  Search,
  Users,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/experiences', label: '経験談を探す', icon: Search },
  { href: '/questions/new', label: '質問する', icon: CircleHelp },
  { href: '/experiences/new', label: '経験談を書く', icon: PenLine },
  { href: '/questions', label: '回答する', icon: Users },
];

function getActiveHref(pathname: string): string | null {
  const matches = navItems.filter((item) =>
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (matches.length === 0) return null;

  return matches.sort((a, b) => b.href.length - a.href.length)[0].href;
}

export function HeaderNavDesktop() {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition ${
              active
                ? 'bg-[#EAF4FB] font-semibold text-[#1478B8]'
                : 'text-[#53616B] hover:bg-[#F1F6F5] hover:text-[#1478B8]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function HeaderNavMobile() {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <nav className="flex gap-1 overflow-x-auto border-t border-[#F1F3F2] px-4 py-2 md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition ${
              active
                ? 'bg-[#1478B8] font-semibold text-white'
                : 'text-[#53616B] hover:bg-[#F1F6F5]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
