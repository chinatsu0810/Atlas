import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, CircleUserRound } from 'lucide-react';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getSession } from '@/lib/auth/session';
import { SWRConfig } from 'swr';
import { Footer } from '@/components/footer';
import { HeaderNavDesktop, HeaderNavMobile } from '@/components/header-nav';
import { getUnreadTotal } from '@/lib/giveaways/queries';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Atlas｜海外生活の質問・回答コミュニティ',
  description:
    '日本と海外をつなぐ、実体験ベースのQ&Aコミュニティ。海外生活、海外赴任・駐在、ワーホリ、留学、移住、海外での子育てなど、海外暮らしの疑問を経験者に質問し、リアルな体験談や回答を見つけられます。',
  alternates: {
    canonical: 'https://www.atlas-community.jp/',
  },
  openGraph: {
    title: 'Atlas｜海外生活の質問・回答コミュニティ',
    description:
      '日本と海外をつなぐ、実体験ベースのQ&Aコミュニティ。',
    url: 'https://www.atlas-community.jp/',
    siteName: 'Atlas',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Atlas｜海外生活の質問・回答コミュニティ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas｜海外生活の質問・回答コミュニティ',
    description:
      '日本と海外をつなぐ、実体験ベースのQ&Aコミュニティ。',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ['latin'] });

async function Header() {
  const session = await getSession();

  // 「譲る」の未読メッセージ。取得に失敗しても、ヘッダーは表示する
  const giveawayUnread = session
    ? await getUnreadTotal(session.user.id).catch(() => 0)
    : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5EAEA] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-5 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[#17324A] transition-opacity hover:opacity-80"
          aria-label="Atlas ホームへ戻る"
        >
          <Image
            src="/atlas-logo.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
          />
          <span className="text-xl font-bold tracking-tight">Atlas</span>
        </Link>

        <HeaderNavDesktop />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {session ? (
            <Link
              href="/account"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-[#53616B] transition hover:bg-[#F1F6F5]"
            >
              マイページ
              <ChevronDown className="h-4 w-4" />
              <span className="relative">
                <CircleUserRound className="h-6 w-6 text-[#1478B8]" />
                {giveawayUnread > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#D14343]"
                    aria-label={`未読メッセージ ${giveawayUnread}件`}
                  />
                )}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="whitespace-nowrap rounded-full border border-[#1F5F5B] px-3 py-1.5 text-xs font-medium text-[#1F5F5B] transition hover:bg-[#E8F5F3] sm:px-4 sm:py-2 sm:text-sm"
              >
                新規登録
              </Link>

              <Link
                href="/sign-in"
                className="whitespace-nowrap rounded-full bg-[#F97316] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#EA580C] sm:px-4 sm:py-2 sm:text-sm"
              >
                ログイン
              </Link>
            </>
          )}
        </div>
      </div>

      <HeaderNavMobile />
    </header>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`bg-white text-black dark:bg-gray-950 dark:text-white ${manrope.className}`}
    >
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4018415742182473"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="min-h-[100dvh] bg-gray-50">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MQZ3XFHD3Y"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MQZ3XFHD3Y');
          `}
        </Script>

        <SWRConfig
          value={{
            fallback: {
              '/api/user': getUser(),
              '/api/team': getTeamForUser(),
            },
          }}
        >
          <Header />
          <main>{children}</main>
          <Footer />
        </SWRConfig>
      </body>
    </html>
  );
}