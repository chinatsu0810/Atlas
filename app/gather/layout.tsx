import { UnderConstructionNotice } from '@/components/under-construction-notice';

// 「集まる」のページ共通。正式に公開するまでは、開発中のお知らせをかぶせて表示する
export default function GatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <UnderConstructionNotice>
        <p>
          「集まる」は、海外で日本語で参加できるイベントを見つけるための機能です。
          <br className="hidden md:block" />
          いま開発中で、イベントはまだ掲載していません。
        </p>
        <p>どんな画面になるのか、ぜひのぞいてみてください。</p>
      </UnderConstructionNotice>
    </>
  );
}
