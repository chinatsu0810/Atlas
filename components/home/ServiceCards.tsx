import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BookMarked,
  ChevronRight,
  Gift,
  PenLine,
  Search,
  UsersRound,
  WandSparkles,
} from 'lucide-react';

const activeServices: {
  icon: LucideIcon;
  title: string;
  description: string;
  links: { label: string; href: string }[];
}[] = [
  {
    icon: Search,
    title: '探す',
    description: '先輩たちのリアルな経験やQ&Aを探す',
    links: [
      { label: '経験談を探す', href: '/experiences' },
      { label: 'Q&Aを探す', href: '/questions' },
    ],
  },
  {
    icon: PenLine,
    title: '書く',
    description: 'あなたの経験が、いつか誰かの道しるべに',
    links: [
      { label: '経験談を書く', href: '/experiences/new' },
      { label: '質問する', href: '/questions/new' },
    ],
  },
];

const comingSoonServices: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Gift,
    title: '譲る',
    description: '帰国・引越し時の不用品を、次に来る人へ',
  },
  {
    icon: UsersRound,
    title: 'つながる',
    description: '同じ国・同じ立場の仲間と出会えるコミュニティ',
  },
  {
    icon: WandSparkles,
    title: 'AI検索',
    description: 'みんなの経験をもとに、AIが疑問に答える',
  },
  {
    icon: BookMarked,
    title: '便利リンク集',
    description: '外務省・大使館など、海外生活に役立つ公式情報をまとめます',
  },
];

export function ServiceCards() {
  return (
    <section id="services" className="mb-10 scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#123B5D] md:text-lg">
          Atlasでできること
        </h2>
        <p className="mt-1 text-xs text-[#6B8498] md:text-sm">
          Atlasは、みんなの経験とともにこれからも育っていきます。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {activeServices.map((service) => {
          const Icon = service.icon;

          return (
            <div
              key={service.title}
              className="rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-sm md:p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF4FB] text-[#1478B8]">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[#174C73]">
                    {service.title}
                  </h3>
                  <p className="text-xs leading-5 text-[#648198] md:text-sm">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {service.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between rounded-xl border border-[#D8E7F0] bg-[#F8FBFD] px-3 py-2.5 text-sm font-semibold text-[#1478B8] transition hover:border-[#9EC6DF] hover:bg-[#F1F8FC]"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:gap-4">
        {comingSoonServices.map((service) => {
          const Icon = service.icon;

          return (
            <div
              key={service.title}
              className="rounded-xl border border-dashed border-[#CFDDE6] bg-[#F4F8FA] px-3 py-3 md:px-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[#7F9AAD]" />
                <h3 className="text-sm font-semibold text-[#4F6B80]">
                  {service.title}
                </h3>
                <span className="rounded-full bg-[#E4ECF1] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#6B8498]">
                  Coming Soon
                </span>
              </div>

              <p className="mt-1.5 hidden text-xs leading-5 text-[#7F95A6] md:block">
                {service.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
