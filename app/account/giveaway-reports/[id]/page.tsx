import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { isAdmin } from '@/lib/auth/permissions';
import { getUser } from '@/lib/db/queries';
import {
  deleteGiveawayMessage,
  hideGiveaway,
  restoreGiveaway,
  setGiveawayReportResolved,
} from '@/lib/giveaways/actions';
import { getGiveawayReportDetail } from '@/lib/giveaways/admin';
import { formatPrice } from '@/lib/giveaways/constants';
import { displayAuthorName } from '@/lib/users/display';
import { GiveawayActionButton } from '@/components/giveaways/action-button';
import { GiveawayStatusBadge } from '@/components/giveaways/status-badge';
import { AccessDenied } from '../../users/access-denied';

export default async function GiveawayReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return <AccessDenied />;
  }

  const reportId = Number((await params).id);
  if (!Number.isInteger(reportId)) notFound();

  const detail = await getGiveawayReportDetail(reportId);
  if (!detail) notFound();

  const { report, giveaway, images, thread } = detail;
  const authorName = displayAuthorName(detail.authorName, detail.authorDeletedAt);
  const applicantName = thread
    ? displayAuthorName(thread.applicantName, thread.applicantDeletedAt)
    : null;

  function senderLabel(senderId: number | null) {
    if (senderId === null) return 'システム';
    if (senderId === giveaway.authorId) return `投稿者（${authorName}）`;
    if (thread && senderId === thread.applicantId) return `希望者（${applicantName}）`;
    return `ユーザーID ${senderId}`;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/account/giveaway-reports"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        通報の一覧へ戻る
      </Link>

      {/* 通報 */}
      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold">
            通報 #{report.id}（{report.messageId !== null ? 'メッセージ' : '投稿'}）
          </h1>
          {report.resolvedAt ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
              対応済み（{new Date(report.resolvedAt).toLocaleString('ja-JP')}）
            </span>
          ) : (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
              未対応
            </span>
          )}
        </div>

        <dl className="mt-3 space-y-1 text-sm">
          <div>
            <dt className="inline text-muted-foreground">通報した人：</dt>
            <dd className="inline">
              {displayAuthorName(detail.reporterName, detail.reporterDeletedAt)}
              <Link
                href={`/account/users/${report.reporterId}`}
                className="ml-2 text-xs text-[#1478B8] underline"
              >
                ユーザー詳細
              </Link>
            </dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">日時：</dt>
            <dd className="inline">{new Date(report.createdAt).toLocaleString('ja-JP')}</dd>
          </div>
        </dl>

        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-orange-50 p-3 text-sm">
          {report.reason}
        </p>

        <div className="mt-4">
          {report.resolvedAt ? (
            <GiveawayActionButton
              action={setGiveawayReportResolved.bind(null, report.id, false)}
              label="未対応に戻す"
              confirmTitle="未対応に戻しますか？"
              confirmBody={<p>通報の一覧に、未対応として表示されます。</p>}
              confirmLabel="未対応に戻す"
              variant="secondary"
            />
          ) : (
            <GiveawayActionButton
              action={setGiveawayReportResolved.bind(null, report.id, true)}
              label="対応済みにする"
              confirmTitle="対応済みにしますか？"
              confirmBody={<p>非表示・削除などの対応が済んだら、対応済みにしてください。</p>}
              confirmLabel="対応済みにする"
            />
          )}
        </div>
      </section>

      {/* 投稿 */}
      <section className="mt-6 rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <GiveawayStatusBadge status={giveaway.status} />
          {giveaway.deletedAt && (
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
              非表示中
            </span>
          )}
        </div>

        <h2 className="mt-2 text-base font-bold">{giveaway.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatPrice(giveaway.priceAmount, giveaway.currency)}・{giveaway.country}・{giveaway.city}
          ・投稿者：{authorName}
          <Link
            href={`/account/users/${giveaway.authorId}`}
            className="ml-2 text-xs text-[#1478B8] underline"
          >
            ユーザー詳細
          </Link>
        </p>

        {images.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((image) => (
              <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg border object-cover"
                />
              </a>
            ))}
          </div>
        )}

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{giveaway.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {giveaway.deletedAt ? (
            <GiveawayActionButton
              action={restoreGiveaway.bind(null, giveaway.id)}
              label="非表示を解除する"
              confirmTitle="非表示を解除しますか？"
              confirmBody={
                <p>投稿とやりとりが、また表示されるようになります。当事者へのメールは送りません。</p>
              }
              confirmLabel="解除する"
              variant="secondary"
            />
          ) : (
            <>
              <GiveawayActionButton
                action={hideGiveaway.bind(null, giveaway.id)}
                label="投稿を非表示にする"
                confirmTitle="この投稿を非表示にしますか？"
                confirmBody={
                  <p>
                    一覧・詳細ページとやりとりが表示されなくなります。投稿者とコメントした人には、利用規約に基づき非表示にしたことがメールで伝わります（理由は書きません）。
                  </p>
                }
                confirmLabel="非表示にする"
                variant="danger"
              />
              <Link
                href={`/giveaways/${giveaway.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-[#1478B8] underline"
              >
                公開ページを開く
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </section>

      {/* やりとり（メッセージの通報のとき） */}
      {thread && (
        <section className="mt-6 rounded-xl border p-5">
          <h2 className="text-base font-bold">やりとりの全体</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            投稿者（{authorName}）と希望者（{applicantName}）のやりとりです。通報されたメッセージは赤枠で表示しています。
            確認は、通報への対応に必要な範囲にとどめてください。
          </p>

          <ol className="mt-4 space-y-3">
            {thread.messages.map((message) => {
              const reported = message.id === report.messageId;

              return (
                <li
                  key={message.id}
                  className={`rounded-lg border p-3 text-sm ${
                    reported ? 'border-red-400 bg-red-50' : ''
                  } ${message.kind === 'system' ? 'bg-gray-50 text-xs text-muted-foreground' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {senderLabel(message.senderId)}・
                      {new Date(message.createdAt).toLocaleString('ja-JP')}
                      {reported && <span className="ml-2 font-semibold text-red-600">通報対象</span>}
                      {message.deletedAt && (
                        <span className="ml-2 font-semibold text-gray-500">削除済み</span>
                      )}
                    </span>

                    {message.kind === 'user' && !message.deletedAt && (
                      <GiveawayActionButton
                        action={deleteGiveawayMessage.bind(null, message.id)}
                        label="削除"
                        confirmTitle="このメッセージを削除しますか？"
                        confirmBody={
                          <p>
                            当事者には「このメッセージは、運営が削除しました」と表示されます。本文は、運営の確認用に残ります。
                          </p>
                        }
                        confirmLabel="削除する"
                        variant="danger"
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      />
                    )}
                  </div>
                  <p
                    className={`mt-1.5 whitespace-pre-wrap ${
                      message.deletedAt ? 'text-muted-foreground line-through' : ''
                    }`}
                  >
                    {message.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </main>
  );
}
