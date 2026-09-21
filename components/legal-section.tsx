// 利用規約・プライバシーポリシーなど、条文のページで共通に使う部品。

export function LegalSection({
  number,
  title,
  article = false,
  children,
}: {
  number: number;
  title: string;
  // true なら「第1条（適用）」の形、false なら「1. 適用」の形で見出しを出す
  article?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-8">
      <h2 className="text-lg font-bold text-gray-900">
        {article ? `第${number}条（${title}）` : `${number}. ${title}`}
      </h2>

      <div className="mt-4 space-y-4 text-sm leading-7 text-gray-700">
        {children}
      </div>
    </section>
  );
}

export function BulletList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}
