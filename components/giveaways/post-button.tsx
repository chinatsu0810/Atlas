'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, PlusCircle } from 'lucide-react';

import {
  GiveawayDialog,
  dialogPrimaryButton,
  dialogSecondaryButton,
  dismissNotice,
  isNoticeDismissed,
} from './giveaway-dialog';

const NOTICE_KEY = 'atlas:giveaways:post-notice-dismissed';

// 「投稿する」ボタン。押すと、投稿フォームへ進む前に、通知の案内を小窓で出す
export function GiveawayPostButton({
  className,
  label = '投稿する',
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  function start() {
    if (dontShowAgain) dismissNotice(NOTICE_KEY);
    setOpen(false);
    router.push('/giveaways/new');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isNoticeDismissed(NOTICE_KEY)) {
            router.push('/giveaways/new');
          } else {
            setOpen(true);
          }
        }}
        className={
          className ??
          'inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1478B8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5686]'
        }
      >
        <PlusCircle className="h-4 w-4" />
        {label}
      </button>

      <GiveawayDialog
        open={open}
        onOpenChange={setOpen}
        icon={<Mail className="h-5 w-5" />}
        title="コメントが届いたら、メールでお知らせします"
        footer={
          <>
            <Link href="/giveaways/guide" className={dialogSecondaryButton}>
              使い方を見る
            </Link>
            <button type="button" onClick={start} className={dialogPrimaryButton}>
              投稿をはじめる
            </button>
          </>
        }
      >
        <p>
          欲しい人からコメントが届いたら、登録しているメールアドレスにお知らせが届きます。
        </p>
        <p>
          メールが迷惑メールフォルダに入ることもあるので、
          <strong className="font-semibold text-[#123B5D]">
            ときどきAtlasのマイページも確認してくださいね。
          </strong>
        </p>
        <p>
          住所や電話番号は投稿に書かないでください。受け渡し予定者が決まってから、取引ページで伝えましょう。
        </p>
        <p className="text-xs text-[#6B8498]">
          禁止品や、利用規約に反する投稿・メッセージは、運営が予告なく削除・非表示にすることがあります。
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
