import type { Metadata } from 'next';

// ページ本体はクライアントコンポーネントのため、メタデータはここで指定する
export const metadata: Metadata = {
  title: '運営に連絡｜Atlas',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
