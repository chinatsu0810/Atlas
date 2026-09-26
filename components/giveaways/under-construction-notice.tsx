'use client';

import { useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Construction, X } from 'lucide-react';

// 「譲る」がまだ準備中であることを知らせる、ページにかぶせる大きなお知らせ。
// 閉じたら、同じタブのあいだは表示しない（sessionStorage）。
// 正式に公開するときは、app/giveaways/layout.tsx からこの部品を外す。

const DISMISSED_KEY = 'atlas:giveaways:under-construction-dismissed';

export function GiveawaysUnderConstructionNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === '1') return;
    } catch {
      // 読めない環境では、毎回表示する
    }
    setOpen(true);
  }, []);

  function close() {
    setOpen(false);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // 保存できなくても、次のページでまた表示されるだけ
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0B2236]/35 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed inset-x-4 top-4 z-[61] mx-auto flex min-h-[min(560px,calc(100dvh-32px))] max-w-3xl flex-col items-center justify-center rounded-3xl border-4 border-dashed border-[#F5B041] bg-[#FFFBF2]/95 px-6 py-10 text-center shadow-[0_24px_80px_rgba(11,34,54,0.35)] outline-none md:inset-x-8 md:top-8 md:px-12">
          <Dialog.Close
            className="absolute right-4 top-4 rounded-full p-2 text-[#8A5A12] transition hover:bg-[#FCEBC8]"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </Dialog.Close>

          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FCEBC8] text-[#D97706] md:h-24 md:w-24">
            <Construction className="h-10 w-10 md:h-12 md:w-12" />
          </span>

          <p className="mt-5 text-sm font-bold tracking-[0.2em] text-[#D97706]">
            UNDER CONSTRUCTION
          </p>

          <Dialog.Title className="mt-2 text-3xl font-black leading-tight text-[#123B5D] md:text-5xl">
            ただいま準備中です
          </Dialog.Title>

          <Dialog.Description asChild>
            <div className="mt-5 max-w-xl space-y-2 text-sm leading-7 text-[#4F6B80] md:text-base">
              <p>
                「譲る」は、帰国・引越しの不用品を次に来る人へ譲るための機能です。
                <br className="hidden md:block" />
                いま、みなさんに使っていただけるよう準備を進めています。
              </p>
              <p>
                投稿やコメントはお試しいただけますが、画面や動きが変わることがあります。
              </p>
            </div>
          </Dialog.Description>

          <button
            type="button"
            onClick={close}
            className="mt-8 rounded-full bg-[#1478B8] px-8 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#0D5686]"
          >
            わかった、見てみる
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
