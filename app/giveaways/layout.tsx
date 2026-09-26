import { GiveawaysUnderConstructionNotice } from '@/components/giveaways/under-construction-notice';

// 「譲る」のページ共通。正式に公開するまでは、準備中のお知らせをかぶせて表示する
export default function GiveawaysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <GiveawaysUnderConstructionNotice />
    </>
  );
}
