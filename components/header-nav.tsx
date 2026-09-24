'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, PenLine, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NavGroup = {
  key: 'find' | 'write';
  label: string;
  icon: LucideIcon;
  items: { href: string; label: string }[];
};

const navGroups: NavGroup[] = [
  {
    key: 'find',
    label: '探す',
    icon: Search,
    items: [
      { href: '/experiences', label: '経験談を探す' },
      { href: '/questions', label: 'Q&Aを探す' },
    ],
  },
  {
    key: 'write',
    label: '書く',
    icon: PenLine,
    items: [
      { href: '/experiences/new', label: '経験談を書く' },
      { href: '/questions/new', label: '質問する' },
    ],
  },
];

const comingSoonItems = ['譲る', 'つながる', 'AI検索', '便利リンク集'];

function getActiveGroup(pathname: string): NavGroup['key'] | null {
  if (pathname === '/experiences/new' || pathname === '/questions/new') {
    return 'write';
  }

  if (
    ['/experiences', '/questions', '/search'].some(
      (href) => pathname === href || pathname.startsWith(`${href}/`)
    )
  ) {
    return 'find';
  }

  return null;
}

function NavGroupMenu({
  group,
  active,
  compact,
}: {
  group: NavGroup;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = group.icon;

  const triggerClass = compact
    ? `flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium outline-none transition ${
        active
          ? 'bg-[#1478B8] font-semibold text-white'
          : 'text-[#53616B] hover:bg-[#F1F6F5] data-[state=open]:bg-[#F1F6F5]'
      }`
    : `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium outline-none transition ${
        active
          ? 'bg-[#EAF4FB] font-semibold text-[#1478B8]'
          : 'text-[#53616B] hover:bg-[#F1F6F5] hover:text-[#1478B8] data-[state=open]:bg-[#F1F6F5]'
      }`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={triggerClass}>
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {group.label}
        <ChevronDown className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="min-w-[10rem] rounded-xl border-[#E1EBF1] bg-white p-1.5 shadow-[0_10px_30px_rgba(20,73,107,0.12)]"
      >
        {group.items.map((item) => (
          <DropdownMenuItem
            key={item.href}
            asChild
            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#174C73] focus:bg-[#F1F8FC] focus:text-[#1478B8]"
          >
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ComingSoonLabel() {
  return (
    <span className="ml-2 shrink-0 whitespace-nowrap rounded-full bg-[#EEF2F5] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#7F95A6]">
      Coming Soon
    </span>
  );
}

export function HeaderNavDesktop() {
  const pathname = usePathname();
  const activeGroup = getActiveGroup(pathname);

  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
      {navGroups.map((group) => (
        <NavGroupMenu
          key={group.key}
          group={group}
          active={group.key === activeGroup}
        />
      ))}

      <span className="mx-2 h-5 w-px shrink-0 bg-[#E5EAEA]" aria-hidden />

      <ComingSoonLabel />

      {comingSoonItems.map((label) => (
        <span
          key={label}
          aria-disabled="true"
          title="Coming Soon"
          className="shrink-0 cursor-default whitespace-nowrap px-3 py-2.5 text-sm text-[#A3B1BB]"
        >
          {label}
        </span>
      ))}
    </nav>
  );
}

export function HeaderNavMobile() {
  const pathname = usePathname();
  const activeGroup = getActiveGroup(pathname);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-t border-[#F1F3F2] px-4 py-2 lg:hidden">
      {navGroups.map((group) => (
        <NavGroupMenu
          key={group.key}
          group={group}
          active={group.key === activeGroup}
          compact
        />
      ))}

      <span className="mx-1 h-4 w-px shrink-0 bg-[#E5EAEA]" aria-hidden />

      <ComingSoonLabel />

      {comingSoonItems.map((label) => (
        <span
          key={label}
          aria-disabled="true"
          className="shrink-0 whitespace-nowrap px-2.5 py-2 text-xs text-[#A3B1BB]"
        >
          {label}
        </span>
      ))}
    </nav>
  );
}
