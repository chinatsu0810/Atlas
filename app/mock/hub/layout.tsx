import type { Metadata } from 'next';
import { FlaskConical } from 'lucide-react';

// 検討用のモック。検索エンジンには載せない
export const metadata: Metadata = {
  title: '情報ハブ（モック）｜Atlas',
  robots: { index: false, follow: false },
};

export default function MockHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FBFD] text-[#123B5D]">
      <div className="border-b border-[#F5D9A8] bg-[#FFFBF2]">
        <p className="mx-auto flex max-w-[1120px] items-center gap-2 px-4 py-2 text-[11px] text-[#8A5A12] md:px-6 md:text-xs">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          検討用のモック画面です。表示している経験談・Q&A・学校名などはサンプルで、実際の投稿ではありません。
        </p>
      </div>
      {children}
    </div>
  );
}
