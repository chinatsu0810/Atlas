import type { Metadata } from 'next';
import { PatternSwitcher } from './_switcher';

// トップページ再設計の提案モック。検索エンジンには載せない
export const metadata: Metadata = {
  title: 'トップページ案（モック）｜Atlas',
  robots: { index: false, follow: false },
};

export default function MockTopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FBFD] text-[#123B5D]">
      <PatternSwitcher />
      {children}
    </div>
  );
}
