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
  metadataBase: new URL('https://www.atlas-community.jp'),

  title: {
    default: 'Atlas',
    template: '%s | Atlas',
  },

  description:
    '海外生活の疑問や体験談を共有するコミュニティ。インド・中国・アメリカなど世界各国の暮らし情報が見つかります。',

  alternates: {
    canonical: '/',
  },

  openGraph: {
    title: 'Atlas',
    description:
      '海外生活の疑問や体験談を共有するコミュニティ。',
    url: 'https://www.atlas-community.jp',
    siteName: 'Atlas',
    locale: 'ja_JP',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Atlas',
    description:
      '海外生活の疑問や体験談を共有するコミュニティ。',
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ['latin'] });

async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Atlas */}
        <Link
          href="/"
          className="flex items-center transition-opacity hover:opacity-80"
          aria-label="Atlas ホームへ戻る"
        >
          <Globe className="h-6 w-6 text-sky-600" />

          <span className="ml-2 text-xl font-semibold tracking-tight text-gray-900">
            Atlas
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {session ? (
            <Link
              href="/account"
              className="
                rounded-lg
                px-3 py-2
                text-sm
                font-medium
                text-gray-700
                hover:bg-gray-100
                transition
              "
            >
              マイページ
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="
                  rounded-lg
                  px-3 py-2
                  text-sm
                  font-medium
                  text-gray-700
                  hover:bg-gray-100
                  transition
                "
              >
                新規登録
              </Link>

              <Link
                href="/sign-in"
                className="
                  rounded-lg
                  bg-orange-500
                  px-3 py-2
                  text-sm
                  font-medium
                  text-white
                  hover:bg-orange-600
                  transition
                "
              >
                ログイン
              </Link>
            </>
          )}
        </nav>
      </div>
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
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        {/* Google Analytics */}
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