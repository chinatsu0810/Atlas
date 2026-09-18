import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getSession } from '@/lib/auth/session';
import { SWRConfig } from 'swr';
import { Footer } from '@/components/footer';
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

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5EAEA] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-5 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[#17324A] transition-opacity hover:opacity-80"
          aria-label="Atlas ホームへ戻る"
        >
          <Globe className="h-7 w-7 text-sky-600" />
          <span className="text-xl font-bold tracking-tight">Atlas</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
          <Link
            href="/"
            className="whitespace-nowrap rounded-full bg-[#E8F5F3] px-5 py-2.5 text-sm font-semibold text-[#1F5F5B]"
          >
            ホーム
          </Link>

          <Link
  href="/questions/new"
  className="whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-[#53616B] transition hover:bg-[#F1F6F5] hover:text-[#1F5F5B]"
>
  質問を投稿する
</Link>

          <Link
            href="/questions"
            className="whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-[#53616B] transition hover:bg-[#F1F6F5] hover:text-[#1F5F5B]"
          >
            回答募集中の質問を探す
          </Link>

         <Link
  href="/questions/new"
  className="whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-[#53616B] transition hover:bg-[#F1F6F5] hover:text-[#1F5F5B]"
>
  経験談を投稿する
</Link>

          <Link
            href="/questions"
            className="whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-[#53616B] transition hover:bg-[#F1F6F5] hover:text-[#1F5F5B]"
          >
            経験談を探す
          </Link>


        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {session ? (
            <Link
              href="/account"
              className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-[#53616B] transition hover:bg-[#F1F6F5]"
            >
              マイページ
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="hidden whitespace-nowrap rounded-full border border-[#1F5F5B] px-4 py-2 text-sm font-medium text-[#1F5F5B] transition hover:bg-[#E8F5F3] sm:block"
              >
                新規登録
              </Link>

              <Link
                href="/sign-in"
                className="whitespace-nowrap rounded-full bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
              >
                ログイン
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-[#F1F3F2] px-4 py-2 md:hidden">
        <Link
          href="/"
          className="whitespace-nowrap rounded-full bg-[#E8F5F3] px-4 py-2 text-xs font-semibold text-[#1F5F5B]"
        >
          ホーム
        </Link>

    <Link
  href="/questions/new"
  className="whitespace-nowrap rounded-full bg-[#1F5F5B] px-4 py-2 text-xs font-semibold text-white"
>
  質問を投稿する
</Link>

        <Link
          href="/questions"
          className="whitespace-nowrap rounded-full px-4 py-2 text-xs text-[#53616B]"
        >
          質問する
        </Link>

      <Link
  href="/questions/new"
  className="whitespace-nowrap rounded-full bg-[#1F5F5B] px-4 py-2 text-xs font-semibold text-white"
>
  経験を投稿する
</Link>
      </nav>
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