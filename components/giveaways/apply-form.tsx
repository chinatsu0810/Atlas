'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle } from 'lucide-react';

import { applyToGiveaway } from '@/lib/giveaways/actions';
import {
  GiveawayDialog,
  dialogPrimaryButton,
  dialogSecondaryButton,
  dismissNotice,
  isNoticeDismissed,
} from './giveaway-dialog';

const NOTICE_KEY = 'atlas:giveaways:apply-notice-dismissed';

// 希望者が投稿者にコメントを送るフォーム。
// 「欲しい！」を押すと、まず小窓で案内を出し、そのあとフォームを開く
export function GiveawayApplyForm({ giveawayId }: { giveawayId: number }) {
  const router = useRouter();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openForm() {
    if (dontShowAgain) dismissNotice(NOTICE_KEY);
    setNoticeOpen(false);
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await applyToGiveaway(giveawayId, body);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    router.push(`/giveaways/threads/${result.data.threadId}`);
  }

  if (!formOpen) {
    return (
      <>
        <button
          type="button"
          onClick={() =>
            isNoticeDismissed(NOTICE_KEY) ? setFormOpen(true) : setNoticeOpen(true)
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F97316] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#EA580C]"
        >
          <Heart className="h-4 w-4" />
          欲しい！コメントする
        </button>

        <GiveawayDialog
          open={noticeOpen}
          onOpenChange={setNoticeOpen}
          icon={<MessageCircle className="h-5 w-5" />}
          title="コメントは、投稿者だけに届きます"
          footer={
            <>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className={dialogSecondaryButton}
              >
                やめる
              </button>
              <button type="button" onClick={openForm} className={dialogPrimaryButton}>
                コメントを書く
              </button>
            </>
          }
        >
          <p>
            コメントは投稿者とあなたの2人だけのページに届き、ほかの人には見えません。
          </p>
          <p>
            投稿者からの返信や、「受け渡し予定者に決定」の連絡は、メールでお知らせします。
            <strong className="font-semibold text-[#123B5D]">
              ときどきAtlasのマイページも確認してくださいね。
            </strong>
          </p>
          <p>
            住所や電話番号は、予定者に決まってから必要な範囲で伝えましょう。
          </p>
          <p className="text-xs text-[#6B8498]">
            利用規約に反するメッセージは、運営が予告なく削除することがあります。
          </p>
          <label className="flex items-center gap-2 pt-1 text-xs text-[#6B8498]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            次回から表示しない
          </label>
        </GiveawayDialog>
      </>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="apply-body" className="block text-sm font-semibold text-[#123B5D]">
        投稿者へのコメント
      </label>
      <textarea
        id="apply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="例：はじめまして。ぜひ譲っていただきたいです。平日の夜か週末なら受け取りに伺えます。"
        className="w-full rounded-xl border border-[#D8E7F0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1478B8] focus:ring-2 focus:ring-[#1478B8]/15"
        disabled={submitting}
        autoFocus
        required
      />

      {error && <p className="text-sm text-[#B03030]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFormOpen(false)}
          className={dialogSecondaryButton}
          disabled={submitting}
        >
          やめる
        </button>
        <button
          type="submit"
          className={`${dialogPrimaryButton} flex-1`}
          disabled={submitting || !body.trim()}
        >
          {submitting ? '送信中…' : '投稿者に送る'}
        </button>
      </div>
    </form>
  );
}
