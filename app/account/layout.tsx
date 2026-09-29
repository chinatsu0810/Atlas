import type { Metadata } from 'next';

// マイページは本人だけが見る画面なので、検索結果に出さない
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}