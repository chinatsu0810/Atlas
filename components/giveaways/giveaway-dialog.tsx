'use client';

import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';

// 「譲る」で使う小窓（お知らせ・確認・警告）
export function GiveawayDialog({
  open,
  onOpenChange,
  icon,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0B2236]/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(11,34,54,0.25)] outline-none md:p-6">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FB] text-[#1478B8]">
                {icon}
              </span>
            )}

            <Dialog.Title className="flex-1 pt-2 text-base font-bold leading-6 text-[#123B5D]">
              {title}
            </Dialog.Title>

            <Dialog.Close
              className="rounded-full p-1 text-[#7F95A6] transition hover:bg-[#F1F6F8]"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description asChild>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[#4F6B80]">
              {children}
            </div>
          </Dialog.Description>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const dialogPrimaryButton =
  'inline-flex items-center justify-center rounded-full bg-[#1478B8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5686] disabled:opacity-60';

export const dialogSecondaryButton =
  'inline-flex items-center justify-center rounded-full border border-[#D8E7F0] bg-white px-5 py-2.5 text-sm font-medium text-[#35617E] transition hover:bg-[#F1F8FC]';

export const dialogDangerButton =
  'inline-flex items-center justify-center rounded-full bg-[#D14343] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B03030] disabled:opacity-60';

// 「次回から表示しない」の記録（ブラウザに保存。使えない環境では毎回表示する）
export function isNoticeDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function dismissNotice(key: string) {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // 保存できなくても、次回また表示されるだけ
  }
}
