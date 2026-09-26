'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SendHorizontal } from 'lucide-react';

import { postMessage } from '@/lib/giveaways/actions';

const REFRESH_INTERVAL_MS = 10_000;

// 画面を開いている間、新着メッセージを取りに行く（リアルタイム通信は使わない）
export function ThreadAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}

export function MessageComposer({ threadId }: { threadId: number }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending || !body.trim()) return;

    setSending(true);
    setError(null);

    const result = await postMessage(threadId, body);

    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setBody('');
    router.refresh();
  }

  return (
    <form onSubmit={send} className="space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="メッセージを入力"
          aria-label="メッセージ"
          className="min-h-[44px] flex-1 resize-y rounded-2xl border border-[#D8E7F0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1478B8] focus:ring-2 focus:ring-[#1478B8]/15"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label="送信"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1478B8] text-white transition hover:bg-[#0D5686] disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-sm text-[#B03030]">{error}</p>}
    </form>
  );
}
