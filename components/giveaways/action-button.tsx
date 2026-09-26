'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import type { ActionResult } from '@/lib/action-result';
import {
  GiveawayDialog,
  dialogDangerButton,
  dialogPrimaryButton,
  dialogSecondaryButton,
} from './giveaway-dialog';

// 状態を変えるボタン。押すと確認の小窓を出し、「はい」で実行する
export function GiveawayActionButton({
  action,
  label,
  confirmTitle,
  confirmBody,
  confirmLabel,
  variant = 'primary',
  className,
  redirectTo,
}: {
  action: () => Promise<ActionResult<unknown>>;
  label: string;
  confirmTitle: string;
  confirmBody: ReactNode;
  confirmLabel: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  // 成功したら移動する先（操作で今のページが見られなくなる場合）
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);

    const result = await action();

    setRunning(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpen(false);

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  const buttonClass =
    variant === 'danger'
      ? 'rounded-full border border-[#F2C4C4] px-4 py-2 text-sm font-medium text-[#B03030] transition hover:bg-[#FDECEC]'
      : variant === 'secondary'
        ? dialogSecondaryButton
        : dialogPrimaryButton;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? buttonClass}
      >
        {label}
      </button>

      <GiveawayDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setError(null);
        }}
        title={confirmTitle}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={dialogSecondaryButton}
              disabled={running}
            >
              やめる
            </button>
            <button
              type="button"
              onClick={run}
              disabled={running}
              className={variant === 'danger' ? dialogDangerButton : dialogPrimaryButton}
            >
              {running ? '処理中…' : confirmLabel}
            </button>
          </>
        }
      >
        {confirmBody}
        {error && <p className="font-medium text-[#B03030]">{error}</p>}
      </GiveawayDialog>
    </>
  );
}
