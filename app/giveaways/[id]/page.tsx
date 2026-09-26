import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CalendarClock,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react';

import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/permissions';
import {
  hideGiveaway,
  relistGiveaway,
  withdrawGiveaway,
} from '@/lib/giveaways/actions';
import { categoryLabel, formatPrice } from '@/lib/giveaways/constants';
import {
  countApplicants,
  findThreadForApplicant,
  getGiveaway,
  listThreadsForOwner,
} from '@/lib/giveaways/queries';
import { displayAuthorName } from '@/lib/users/display';
import { BackButton } from '@/components/back-button';
import { GiveawayActionButton } from '@/components/giveaways/action-button';
import { GiveawayApplyForm } from '@/components/giveaways/apply-form';
import { GiveawayReportButton } from '@/components/giveaways/report-button';
import { GiveawayStatusBadge } from '@/components/giveaways/status-badge';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const giveawayId = Number(id);
  if (!Number.isInteger(giveawayId)) return {};

  const data = await getGiveaway(giveawayId);
  if (!data) return {};

  const { giveaway, images } = data;
  const description = `${giveaway.country}・${giveaway.city}｜${formatPrice(
    giveaway.priceAmount,
    giveaway.currency
  )}｜${giveaway.description.slice(0, 120)}`;

  return {
    title: `${giveaway.title}｜譲る`,
    description,
    alternates: { canonical: `/giveaways/${giveaway.id}` },
    openGraph: {
      title: giveaway.title,
      description,
      url: `/giveaways/${giveaway.id}`,
      images: images[0] ? [images[0].url] : undefined,
    },
  };
}

export default async function GiveawayPage({ params }: Props) {
  const { id } = await params;
  const giveawayId = Number(id);
  if (!Number.isInteger(giveawayId)) notFound();

  const data = await getGiveaway(giveawayId);
  if (!data) notFound();

  const { giveaway, images, authorName, authorDeletedAt } = data;

  const session = await getSession();
  const viewerId = session?.user.id ?? null;
  const isOwner = viewerId === giveaway.authorId;
  const admin = viewerId ? await isAdmin(viewerId) : false;

  const [applicantCount, ownerThreads, myThread] = await Promise.all([
    countApplicants(giveaway.id),
    isOwner ? listThreadsForOwner(giveaway.id, viewerId!) : Promise.resolve([]),
    viewerId && !isOwner
      ? findThreadForApplicant(giveaway.id, viewerId)
      : Promise.resolve(null),
  ]);

  const recipientThread = ownerThreads.find(
    (thread) => thread.applicantId === giveaway.recipientId
  );

  return (
    <main className="min-h-screen bg-[#F8FBFD] text-[#123B5D]">
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-6 md:py-10">
        <div className="mb-4">
          <BackButton />
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:gap-8">
          {/* 写真 */}
          <div>
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl">
              {images.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  src={image.url}
                  alt={`${giveaway.title}の写真${index + 1}`}
                  className="aspect-square w-full shrink-0 snap-center rounded-2xl border border-[#E1EBF1] bg-white object-contain"
                />
              ))}
            </div>
            {images.length > 1 && (
              <p className="mt-2 text-center text-xs text-[#8AA0B0]">
                横にスクロールすると、ほかの写真（全{images.length}枚）が見られます
              </p>
            )}
          </div>

          {/* 情報 */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GiveawayStatusBadge status={giveaway.status} />
              {applicantCount > 0 && (
                <span className="text-xs text-[#6B8498]">
                  希望者 {applicantCount}人
                </span>
              )}
            </div>

            <h1 className="mt-3 text-xl font-bold leading-snug md:text-2xl">
              {giveaway.title}
            </h1>

            <p className="mt-2 text-2xl font-bold text-[#1478B8]">
              {formatPrice(giveaway.priceAmount, giveaway.currency)}
            </p>

            <dl className="mt-4 space-y-2 rounded-2xl border border-[#E1EBF1] bg-white p-4 text-sm">
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7F9AAD]" />
                <dd>
                  {giveaway.country}・{giveaway.city}
                  {giveaway.area && (
                    <span className="text-[#6B8498]">（{giveaway.area}）</span>
                  )}
                </dd>
              </div>
              <div className="flex gap-2">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[#7F9AAD]" />
                <dd>{categoryLabel(giveaway.category)}</dd>
              </div>
              {giveaway.availableUntil && (
                <div className="flex gap-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#7F9AAD]" />
                  <dd>
                    {new Date(giveaway.availableUntil).toLocaleDateString('ja-JP', {
                      timeZone: 'UTC',
                    })}
                    まで受け渡し可能
                  </dd>
                </div>
              )}
              {giveaway.status === 'open' && (
                <div className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#7F9AAD]" />
                  <dd>
                    {new Date(giveaway.expiresAt).toLocaleDateString('ja-JP', {
                      timeZone: 'UTC',
                    })}
                    まで募集
                  </dd>
                </div>
              )}
              <div className="flex gap-2">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#7F9AAD]" />
                <dd>
                  {displayAuthorName(authorName, authorDeletedAt)}
                  <span className="ml-2 text-xs text-[#8AA0B0]">
                    {new Date(giveaway.createdAt).toLocaleDateString('ja-JP')} 投稿
                  </span>
                </dd>
              </div>
            </dl>

            {/* 閲覧者ごとの操作 */}
            <div className="mt-5 space-y-3">
              {!session && giveaway.status === 'open' && (
                <Link
                  href={`/sign-in?redirect=/giveaways/${giveaway.id}`}
                  className="flex w-full items-center justify-center rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white hover:bg-[#EA580C]"
                >
                  ログインしてコメントする
                </Link>
              )}

              {session && !isOwner && myThread && (
                <Link
                  href={`/giveaways/threads/${myThread.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1478B8] px-6 py-3 text-sm font-bold text-white hover:bg-[#0D5686]"
                >
                  <MessageCircle className="h-4 w-4" />
                  {giveaway.recipientId === viewerId
                    ? '取引ページを開く'
                    : '投稿者とのやりとりを見る'}
                </Link>
              )}

              {session && !isOwner && !myThread && giveaway.status === 'open' && (
                <GiveawayApplyForm giveawayId={giveaway.id} />
              )}

              {!isOwner && giveaway.status !== 'open' && !myThread && (
                <p className="rounded-xl bg-[#EEF2F5] px-4 py-3 text-center text-sm text-[#5B7183]">
                  この投稿は、現在コメントを受け付けていません。
                </p>
              )}

              {isOwner && (
                <OwnerPanel
                  giveawayId={giveaway.id}
                  status={giveaway.status}
                  recipientThreadId={recipientThread?.id ?? null}
                />
              )}
            </div>
          </div>
        </div>

        {/* 説明 */}
        <section className="mt-8 rounded-2xl border border-[#E1EBF1] bg-white p-5 md:p-6">
          <h2 className="text-sm font-bold text-[#406783]">説明</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">
            {giveaway.description}
          </p>
        </section>

        {/* 投稿者：希望者の一覧 */}
        {isOwner && (
          <section className="mt-6 rounded-2xl border border-[#E1EBF1] bg-white p-5 md:p-6">
            <h2 className="text-sm font-bold text-[#406783]">
              届いたコメント（{ownerThreads.length}人）
            </h2>
            <p className="mt-1 text-xs text-[#8AA0B0]">
              コメントはあなたと各希望者の2人だけに見えています。やりとりを開いて、受け渡し予定者を決めましょう。
            </p>

            {ownerThreads.length === 0 ? (
              <p className="mt-4 text-sm text-[#6B8498]">
                まだコメントはありません。届いたらメールでお知らせします。
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#EEF2F5]">
                {ownerThreads.map((thread) => (
                  <li key={thread.id}>
                    <Link
                      href={`/giveaways/threads/${thread.id}`}
                      className="flex items-center gap-3 py-3 transition hover:bg-[#F8FBFD]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FB] text-[#1478B8]">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {displayAuthorName(thread.applicantName, thread.applicantDeletedAt)}
                          {thread.applicantId === giveaway.recipientId && (
                            <span className="rounded-full bg-[#FFF1DC] px-2 py-0.5 text-[10px] font-semibold text-[#B45F06]">
                              予定者
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-[#8AA0B0]">
                          最終更新 {new Date(thread.lastMessageAt).toLocaleString('ja-JP')}
                        </span>
                      </span>
                      {thread.unread > 0 && (
                        <span className="rounded-full bg-[#D14343] px-2 py-0.5 text-xs font-bold text-white">
                          {thread.unread}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#A3B1BB]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 安全のために */}
        <section className="mt-6 rounded-2xl bg-[#EAF4FB] p-5 text-sm leading-6 text-[#35617E]">
          <h2 className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-4 w-4" />
            安全に受け渡すために
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>受け渡しは、駅やショッピングモールなど人の多い場所で行いましょう。</li>
            <li>代金の先払いは避け、受け渡しのときに当事者同士で確認しましょう。</li>
            <li>住所や電話番号は、予定者が決まってから必要な範囲だけ伝えましょう。</li>
          </ul>
          <p className="mt-2 text-xs text-[#6B8498]">
            Atlasは場の提供のみを行い、取引の当事者にはなりません。
            <Link href="/giveaways/guide" className="ml-1 font-semibold underline">
              使い方を見る
            </Link>
          </p>
        </section>

        <div className="mt-6 flex items-center justify-between">
          {session && !isOwner ? (
            <GiveawayReportButton giveawayId={giveaway.id} label="この投稿を通報する" />
          ) : (
            <span />
          )}

          {admin && (
            <GiveawayActionButton
              action={hideGiveaway.bind(null, giveaway.id)}
              label="運営：非表示にする"
              confirmTitle="この投稿を非表示にしますか？"
              confirmBody={
                <p>
                  一覧・詳細ページとやりとりが表示されなくなります。投稿者とコメントした人には、利用規約に基づき非表示にしたことがメールで伝わります（理由は書きません）。
                </p>
              }
              confirmLabel="非表示にする"
              variant="danger"
              redirectTo="/giveaways"
            />
          )}
        </div>
      </div>
    </main>
  );
}

function OwnerPanel({
  giveawayId,
  status,
  recipientThreadId,
}: {
  giveawayId: number;
  status: string;
  recipientThreadId: number | null;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#D8E7F0] bg-white p-4">
      <p className="text-xs font-semibold text-[#406783]">あなたの投稿です</p>

      {(status === 'reserved' || status === 'handed_over') && recipientThreadId && (
        <Link
          href={`/giveaways/threads/${recipientThreadId}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1478B8] px-6 py-3 text-sm font-bold text-white hover:bg-[#0D5686]"
        >
          <MessageCircle className="h-4 w-4" />
          取引ページを開く
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {status === 'open' && (
          <Link
            href={`/giveaways/${giveawayId}/edit`}
            className="rounded-full border border-[#D8E7F0] px-4 py-2 text-sm font-medium text-[#35617E] hover:bg-[#F1F8FC]"
          >
            編集する
          </Link>
        )}

        {status === 'expired' && (
          <GiveawayActionButton
            action={relistGiveaway.bind(null, giveawayId)}
            label="もう一度募集する"
            confirmTitle="もう一度募集しますか？"
            confirmBody={<p>今日から30日間、募集中として表示されます。</p>}
            confirmLabel="募集する"
          />
        )}

        {(status === 'open' || status === 'reserved') && (
          <GiveawayActionButton
            action={withdrawGiveaway.bind(null, giveawayId)}
            label="取り下げる"
            confirmTitle="この投稿を取り下げますか？"
            confirmBody={
              <p>
                取り下げると、元に戻せません。コメントをくれた人には、取り下げたことがメールで伝わります。
              </p>
            }
            confirmLabel="取り下げる"
            variant="danger"
          />
        )}
      </div>
    </div>
  );
}
