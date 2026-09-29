import type { Metadata } from 'next';

// ログイン・パスワード関係の画面は、検索結果に出さない
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
