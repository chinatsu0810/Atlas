'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';

import { reportGiveaway } from '@/lib/giveaways/actions';
import {
  GiveawayDialog,
  dialogDangerButton,
  dialogSecondaryButton,
} from './giveaway-dialog';

// 投稿・メッセージの通報。運営にメールで届く
export function GiveawayReportButton({
  giveawayId,
  messageId = null,
  label = '通報する',
  className,
}: {
  giveawayId: number;
  messageId?: number | null;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send() {
    setSending(true);
    setError(null);

    const result = await reportGiveaway(giveawayId, reason, messageId);

    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDone(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
          setReason('');
        }}
        className={
          className ??
          'inline-flex items-center gap-1 text-xs text-[#8AA0B0] transition hover:text-[#B03030]'
        }
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </button>

      <GiveawayDialog
        open={open}
        onOpenChange={setOpen}
        title={done ? '通報を受け付けました' : '運営に通報する'}
        footer={
          done ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={dialogSecondaryButton}
            >
              閉じる
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={dialogSecondaryButton}
                disabled={sending}
              >
                やめる
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending || !reason.trim()}
                className={dialogDangerButton}
              >
                {sending ? '送信中…' : '通報する'}
              </button>
            </>
          )
        }
      >
        {done ? (
          <p>ご協力ありがとうございます。運営が内容を確認し、必要に応じて対応します。</p>
        ) : (
          <>
            <p>禁止品の出品、詐欺が疑われる、不快なメッセージなど、理由を教えてください。</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              aria-label="通報の理由"
              className="w-full rounded-xl border border-[#D8E7F0] px-3 py-2 text-sm text-[#123B5D] outline-none focus:border-[#1478B8]"
            />
            {error && <p className="font-medium text-[#B03030]">{error}</p>}
          </>
        )}
      </GiveawayDialog>
    </>
  );
}
