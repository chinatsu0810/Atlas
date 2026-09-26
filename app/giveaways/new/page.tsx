import type { Metadata } from 'next';
import Link from 'next/link';

import { getSession } from '@/lib/auth/session';
import { BackButton } from '@/components/back-button';
import { GiveawayForm } from '@/components/giveaways/giveaway-form';

export const metadata: Metadata = {
  title: '譲る物を投稿する',
  robots: { index: false },
};

export default async function NewGiveawayPage() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-6 text-[#123B5D] md:px-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <BackButton />
        </div>

        <div className="rounded-2xl border border-[#E1EBF1] bg-white p-5 shadow-sm md:p-8">
          <h1 className="text-xl font-bold">譲る物を投稿する</h1>
          <p className="mt-1 text-sm text-[#668096]">
            欲しい人からコメントが届いたら、メールでお知らせします。
          </p>

          <div className="mt-6">
            {session ? (
              <GiveawayForm />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#668096]">
                  投稿するにはログインが必要です。
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/sign-in?redirect=/giveaways/new"
                    className="rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#EA580C]"
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/sign-up?redirect=/giveaways/new"
                    className="rounded-full border border-[#D8E7F0] px-5 py-2.5 text-sm font-medium text-[#35617E] hover:bg-[#F1F8FC]"
                  >
                    新規登録
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
