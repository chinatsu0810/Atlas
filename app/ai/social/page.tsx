import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getRecentSocialWorkflows } from '@/lib/ai/social/actions';
import { getThreadsStatus } from '@/lib/threads/actions';

import { SocialDraftForm } from './social-draft-form';
import { ThreadsPanel } from './threads-panel';

export default async function SocialDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ threads?: string; detail?: string }>;
}) {
  const { threads: threadsNotice, detail: threadsNoticeDetail } = await searchParams;
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">
          アクセスできません
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          このページは運営のみ利用できます。
        </p>

        <Link
          href="/account"
          className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          マイページへ戻る
        </Link>
      </main>
    );
  }

  const [initialWorkflows, threadsStatus] = await Promise.all([
    getRecentSocialWorkflows(30),
    getThreadsStatus(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/office"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Atlas Officeへ戻る
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
          <Sparkles className="h-5 w-5 text-orange-500" />
        </div>

        <div>
          <p className="text-sm text-muted-foreground">運営</p>

          <h1 className="text-2xl font-bold tracking-tight">
            Threads投稿案の作成
          </h1>
        </div>
      </div>

      <p className="mb-8 text-sm text-muted-foreground">
        「今週分を作成」を押すと、AIがテーマ・想定読者を見立てて1週間分の投稿案をまとめて作成します。
        リサーチャー・ライター・監査役の3役が連携し、監査に合格すると「確認待ち」で必ず停止します。
        担当者が確認・承認するまで先には進みません。承認後もThreadsへは手動で投稿してください。
        このページからThreadsへ自動投稿されることはありません。
      </p>

      <div className="mb-8">
        <ThreadsPanel
          initialStatus={threadsStatus}
          notice={threadsNotice ?? null}
          noticeDetail={threadsNoticeDetail ?? null}
        />
      </div>

      <Suspense>
        <SocialDraftForm initialWorkflows={initialWorkflows} />
      </Suspense>
    </main>
  );
}
