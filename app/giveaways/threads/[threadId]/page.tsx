import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ChevronLeft, Info, ShieldCheck } from 'lucide-react';

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import {
  cancelReservation,
  confirmReceived,
  markHandedOver,
  reserveApplicant,
} from '@/lib/giveaways/actions';
import {
  canPostToThread,
  getThreadForViewer,
  listMessages,
  markThreadRead,
  type GiveawayRole,
} from '@/lib/giveaways/queries';
import type { Giveaway, GiveawayThread } from '@/lib/db/schema';
import { displayAuthorName } from '@/lib/users/display';
import { GiveawayActionButton } from '@/components/giveaways/action-button';
import {
  MessageComposer,
  ThreadAutoRefresh,
} from '@/components/giveaways/message-composer';
import { GiveawayReportButton } from '@/components/giveaways/report-button';
import { GiveawayStatusBadge } from '@/components/giveaways/status-badge';

export const metadata: Metadata = {
  title: 'やりとり｜譲る',
  robots: { index: false },
};

type Props = { params: Promise<{ threadId: string }> };

export default async function GiveawayThreadPage({ params }: Props) {
  const { threadId: rawId } = await params;
  const threadId = Number(rawId);
  if (!Number.isInteger(threadId)) notFound();

  const session = await getSession();
  if (!session) redirect(`/sign-in?redirect=/giveaways/threads/${threadId}`);

  const context = await getThreadForViewer(threadId, session.user.id);
  if (!context) notFound();

  const { thread, giveaway, role } = context;

  // 開いたら既読にする（画面の自動更新でも、そのたびに既読になる）
  await markThreadRead(threadId, role);

  const counterpartId = role === 'owner' ? thread.applicantId : giveaway.authorId;

  const [messages, [counterpart]] = await Promise.all([
    listMessages(threadId),
    db
      .select({ name: users.name, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, counterpartId))
      .limit(1),
  ]);

  const counterpartName = displayAuthorName(counterpart?.name, counterpart?.deletedAt);
  const canPost = canPostToThread(thread, giveaway);
  const isTrade = giveaway.recipientId === thread.applicantId;

  return (
    <main className="min-h-screen bg-[#F8FBFD] text-[#123B5D]">
      <ThreadAutoRefresh />

      <div className="mx-auto max-w-2xl px-4 py-5 md:px-6 md:py-8">
        <Link
          href={role === 'owner' ? `/giveaways/${giveaway.id}` : '/account/giveaways'}
          className="inline-flex items-center gap-1 text-sm text-[#6B8498] hover:text-[#123B5D]"
        >
          <ChevronLeft className="h-4 w-4" />
          {role === 'owner' ? '投稿に戻る' : '譲る（マイページ）に戻る'}
        </Link>

        <div className="mt-3 rounded-2xl border border-[#E1EBF1] bg-white p-4">
          <div className="flex items-center gap-2">
            <GiveawayStatusBadge status={giveaway.status} />
            <span className="text-xs text-[#8AA0B0]">
              {isTrade ? '取引ページ' : 'コメントのやりとり'}
            </span>
          </div>
          <Link
            href={`/giveaways/${giveaway.id}`}
            className="mt-2 block font-bold leading-snug hover:underline"
          >
            {giveaway.title}
          </Link>
          <p className="mt-1 text-xs text-[#6B8498]">
            {role === 'owner' ? '希望者' : '投稿者'}：{counterpartName}
            <span className="ml-2">
              （このページは、あなたと{counterpartName}さんだけが見られます）
            </span>
          </p>
        </div>

        <StatusPanel role={role} thread={thread} giveaway={giveaway} />

        <div className="mt-3 flex gap-2 rounded-xl bg-[#FFF6E8] px-4 py-3 text-xs leading-5 text-[#8A5A12]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            受け渡しは人の多い場所で。代金の先払いは避けましょう。住所や電話番号は、受け渡しに必要な範囲だけ伝えてください。
          </p>
        </div>

        {/* メッセージ */}
        <section className="mt-5 space-y-3" aria-label="メッセージ">
          {messages.map((message) => {
            if (message.kind === 'system') {
              return (
                <p
                  key={message.id}
                  className="mx-auto max-w-[90%] rounded-full bg-[#EEF2F5] px-4 py-1.5 text-center text-xs leading-5 text-[#5B7183]"
                >
                  {message.body}
                </p>
              );
            }

            const mine = message.senderId === session.user.id;

            if (message.deletedAt) {
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <p className="rounded-2xl border border-dashed border-[#D8E7F0] px-4 py-2 text-xs text-[#8AA0B0]">
                    このメッセージは、運営が削除しました。
                  </p>
                </div>
              );
            }

            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                      mine
                        ? 'rounded-br-md bg-[#1478B8] text-white'
                        : 'rounded-bl-md border border-[#E1EBF1] bg-white'
                    }`}
                  >
                    {message.body}
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-3 text-[11px] text-[#A3B1BB] ${
                      mine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {!mine && (
                      <GiveawayReportButton
                        giveawayId={giveaway.id}
                        messageId={message.id}
                        label="通報"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="sticky bottom-0 mt-5 border-t border-[#E1EBF1] bg-[#F8FBFD] py-3">
          {canPost ? (
            <MessageComposer threadId={threadId} />
          ) : (
            <p className="rounded-xl bg-[#EEF2F5] px-4 py-3 text-center text-sm text-[#5B7183]">
              {closedReason(giveaway, thread)}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function closedReason(giveaway: Giveaway, thread: GiveawayThread): string {
  if (giveaway.status === 'completed') return '取引は完了しました。このやりとりは閲覧のみできます。';
  if (giveaway.status === 'withdrawn') return 'この投稿は取り下げられました。';
  if (giveaway.status === 'expired') return '募集期間が終わりました。';
  if (giveaway.recipientId !== thread.applicantId) {
    return 'ほかの方が受け渡し予定者に決まったため、募集は締め切られました。';
  }
  return 'このやりとりには、現在メッセージを送れません。';
}

// 立場と状態ごとの、状態を進めるボタン
function StatusPanel({
  role,
  thread,
  giveaway,
}: {
  role: GiveawayRole;
  thread: GiveawayThread;
  giveaway: Giveaway;
}) {
  const isRecipientThread = giveaway.recipientId === thread.applicantId;

  let guide: string | null = null;
  const buttons: React.ReactNode[] = [];

  if (role === 'owner') {
    if (giveaway.status === 'open') {
      guide = 'この人に譲ると決めたら、受け渡し予定者に決定しましょう。ほかの希望者には、募集を締め切ったことが自動で伝わります。';
      buttons.push(
        <GiveawayActionButton
          key="reserve"
          action={reserveApplicant.bind(null, thread.id)}
          label="この人を受け渡し予定者に決定"
          confirmTitle="受け渡し予定者に決定しますか？"
          confirmBody={
            <p>
              決定すると、このページが取引ページになります。ほかの希望者とのやりとりは締め切られます（予定をキャンセルすれば、募集中に戻せます）。
            </p>
          }
          confirmLabel="決定する"
        />
      );
    } else if (giveaway.status === 'reserved' && isRecipientThread) {
      guide = '受け渡しの日時と場所を相談しましょう。渡し終えたら「受け渡した」を押してください。';
      buttons.push(
        <GiveawayActionButton
          key="handover"
          action={markHandedOver.bind(null, giveaway.id)}
          label="受け渡した"
          confirmTitle="受け渡しが済みましたか？"
          confirmBody={
            <p>
              相手に受け取りの確認をお願いするメールが届きます。相手が確認するか、7日たつと完了になります。
            </p>
          }
          confirmLabel="受け渡した"
        />,
        <GiveawayActionButton
          key="cancel"
          action={cancelReservation.bind(null, giveaway.id)}
          label="予定をキャンセル"
          confirmTitle="受け渡しの予定をキャンセルしますか？"
          confirmBody={<p>投稿は募集中に戻り、相手にはメールで伝わります。</p>}
          confirmLabel="キャンセルする"
          variant="danger"
        />
      );
    } else if (giveaway.status === 'handed_over' && isRecipientThread) {
      guide = '相手の受け取りの確認を待っています。7日たつと自動で完了になります。';
    }
  } else if (isRecipientThread) {
    if (giveaway.status === 'reserved') {
      guide = 'あなたが受け渡し予定者です。受け渡しの日時と場所を相談しましょう。';
      buttons.push(
        <GiveawayActionButton
          key="decline"
          action={cancelReservation.bind(null, giveaway.id)}
          label="辞退する"
          confirmTitle="受け渡しを辞退しますか？"
          confirmBody={<p>投稿は募集中に戻り、投稿者にはメールで伝わります。</p>}
          confirmLabel="辞退する"
          variant="danger"
        />
      );
    } else if (giveaway.status === 'handed_over') {
      guide = '投稿者が「受け渡した」と報告しました。受け取ったら、確認を押してください。';
      buttons.push(
        <GiveawayActionButton
          key="confirm"
          action={confirmReceived.bind(null, giveaway.id)}
          label="受け取りを確認"
          confirmTitle="受け取りましたか？"
          confirmBody={<p>確認すると、取引が完了します。</p>}
          confirmLabel="受け取った"
        />
      );
    }
  } else if (giveaway.status === 'open') {
    guide = '投稿者があなたを受け渡し予定者に決めると、メールでお知らせします。';
  }

  if (!guide && buttons.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#C9DFEA] bg-white p-4">
      {guide && (
        <p className="flex gap-2 text-sm leading-6 text-[#35617E]">
          <Info className="mt-1 h-4 w-4 shrink-0 text-[#1478B8]" />
          {guide}
        </p>
      )}
      {buttons.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{buttons}</div>}
    </div>
  );
}
