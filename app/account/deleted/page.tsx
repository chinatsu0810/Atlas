import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountDeletedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />

        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          アカウントを削除しました
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          アカウント情報を削除しました。投稿した質問・回答・経験談は
          非表示にし、30日後に完全に削除します。
        </p>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          ご利用ありがとうございました。
        </p>

        <Button
          asChild
          className="mt-8 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Link href="/">
            トップページへ戻る
          </Link>
        </Button>
      </div>
    </main>
  );
}
