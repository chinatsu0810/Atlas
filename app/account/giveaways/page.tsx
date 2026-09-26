import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ChevronRight, Gift } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import {
  listMyApplications,
  listMyGiveaways,
} from '@/lib/giveaways/queries';
import { displayAuthorName } from '@/lib/users/display';
import { GiveawayPostButton } from '@/components/giveaways/post-button';
import { GiveawayStatusBadge } from '@/components/giveaways/status-badge';

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="shrink-0 rounded-full bg-[#D14343] px-2 py-0.5 text-xs font-bold text-white">
      未読 {count}
    </span>
  );
}

export default async function MyGiveawaysPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in?redirect=/account/giveaways');

  const [mine, applications] = await Promise.all([
    listMyGiveaways(user.id),
    listMyApplications(user.id),
  ]);

  return (
    <section className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 md:mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">譲る</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              自分の投稿と、コメントした投稿のやりとりを確認できます。
            </p>
          </div>
          <GiveawayPostButton />
        </div>

        <h2 className="mb-3 text-base font-bold">自分の投稿</h2>
        {mine.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-6 text-center">
            <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">まだ投稿していません。</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mine.map((item) => (
              <Link key={item.id} href={`/giveaways/${item.id}`} className="block">
                <div className="flex items-center gap-3 rounded-xl border p-4 transition hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <GiveawayStatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">
                        {item.country}・{item.city}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      希望者 {item.applicants}人・
                      {new Date(item.createdAt).toLocaleDateString('ja-JP')} 投稿
                    </p>
                  </div>
                  <UnreadBadge count={item.unread} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <h2 className="mb-3 mt-8 text-base font-bold">コメントした投稿</h2>
        {applications.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              まだコメントしていません。
              <Link href="/giveaways" className="ml-1 font-semibold text-[#1478B8] underline">
                投稿を探す
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((item) => (
              <Link key={item.threadId} href={`/giveaways/threads/${item.threadId}`} className="block">
                <div className="flex items-center gap-3 rounded-xl border p-4 transition hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <GiveawayStatusBadge status={item.status} />
                      {item.recipientId === user.id && (
                        <span className="rounded-full bg-[#FFF1DC] px-2 py-0.5 text-[10px] font-semibold text-[#B45F06]">
                          あなたが予定者
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      投稿者：{displayAuthorName(item.authorName, item.authorDeletedAt)}・
                      {item.country}・{item.city}
                    </p>
                  </div>
                  <UnreadBadge count={item.unread} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 md:mt-10">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイページに戻る
          </Link>
        </div>
      </div>
    </section>
  );
}
