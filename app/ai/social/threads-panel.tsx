'use client';

import { useState } from 'react';
import { BarChart3, Link2, Loader2, Unplug } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  disconnectThreads,
  runWeeklyKpiReview,
  type ThreadsStatus,
  type WeeklyKpiReview,
} from '@/lib/threads/actions';
import type { KpiReportView } from '@/lib/threads/reports';

// サーバーとブラウザで表示がずれないよう（ハイドレーションの不一致を避けるため）、日本時間で固定する
const formatJst = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', ...options });

// /api/threads/callback から戻ってきたときの結果
const NOTICES: Record<string, { text: string; tone: 'ok' | 'error' }> = {
  connected: { text: 'Threadsと連携しました。', tone: 'ok' },
  denied: { text: 'Threadsの認可がキャンセルされました。', tone: 'error' },
  state_error: {
    text: '連携の確認に失敗しました（有効期限切れの可能性があります）。もう一度お試しください。',
    tone: 'error',
  },
  error: {
    text: 'Threadsとの連携に失敗しました。アプリの設定（リダイレクトURI・権限・テスター登録）を確認してください。',
    tone: 'error',
  },
  not_configured: {
    text: 'Threads連携が設定されていません（THREADS_APP_ID / THREADS_APP_SECRET）。',
    tone: 'error',
  },
  invalid_app_id: {
    text: 'THREADS_APP_ID が数字だけの形式ではありません。Vercelの環境変数に、空白・引用符・別の文字列が混ざっていないか確認してください。',
    tone: 'error',
  },
  insecure_redirect: {
    text: 'MetaはHTTPSのコールバックURLしか受け付けません。本番サイト（HTTPS）から連携してください。',
    tone: 'error',
  },
  host_mismatch: {
    text: '連携は、コールバックURLと同じサイトから始めてください（別のサイトから始めると、戻ってきたときにログインと確認が失われて失敗します）。',
    tone: 'error',
  },
};

function ReviewList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">なし</p>
      ) : (
        <ul className="list-inside list-disc space-y-0.5">
          {items.map((item, index) => (
            <li key={index} className="text-sm">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ThreadsPanel({
  initialStatus,
  notice,
  noticeDetail,
  initialReports,
}: {
  initialStatus: ThreadsStatus;
  notice: string | null;
  noticeDetail: string | null;
  // 保存済みの分析（新しい順）
  initialReports: KpiReportView[];
}) {
  const [status, setStatus] = useState<ThreadsStatus>(initialStatus);
  const [isRunning, setIsRunning] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<KpiReportView[]>(initialReports);
  // 表示中の分析。最初は、保存済みの最新の分析（ページを開き直しても、前回の分析が見られる）
  const [result, setResult] = useState<WeeklyKpiReview | null>(initialReports[0] ?? null);

  const noticeInfo = notice ? NOTICES[notice] : undefined;

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setErrorMessage('');

    try {
      const response = await runWeeklyKpiReview();

      if (response.ok) {
        const report = response.data;

        setResult(report);

        if (report.id !== null) {
          setHistory((current) => [report, ...current]);
        }
      } else {
        setErrorMessage(response.error);
      }
    } catch {
      setErrorMessage('通信エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;

    if (!window.confirm('Threadsとの連携を解除しますか？（保存されたアクセストークンを削除します）')) {
      return;
    }

    setIsDisconnecting(true);
    setErrorMessage('');

    try {
      const response = await disconnectThreads();

      if (response.ok) {
        setStatus({ ...status, connected: false, username: null, expiresAt: null, expired: false });
        setResult(null);
      } else {
        setErrorMessage(response.error);
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-[#1478B8]" />

          <div>
            <p className="text-sm font-semibold">Threads連携（分析担当）</p>

            <p className="mt-1 text-xs text-muted-foreground">
              運営のThreadsアカウントの直近7日間の数字を取得し、分析担当が傾向・懸念・改善の材料を整理します。
              分析担当は決定せず、判断はあなたが行います。
            </p>
          </div>
        </div>

        {!status.configured ? null : status.connected && !status.expired ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleRun} disabled={isRunning}>
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                '今週の数字を分析する'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleDisconnect}
              disabled={isDisconnecting || isRunning}
              className="text-muted-foreground"
            >
              <Unplug className="h-4 w-4" />
              連携を解除
            </Button>
          </div>
        ) : !status.redirectUriIsSecure ? (
          <Button type="button" variant="outline" disabled>
            <Link2 className="h-4 w-4" />
            Threadsと連携する
          </Button>
        ) : (
          <Button asChild variant="outline">
            <a href="/api/threads/connect">
              <Link2 className="h-4 w-4" />
              {status.expired ? 'Threadsと再連携する' : 'Threadsと連携する'}
            </a>
          </Button>
        )}
      </div>

      {status.configured && !status.redirectUriIsSecure && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          現在のコールバックURL（{status.redirectUri}）はHTTPSではないため、Metaに登録できず、
          連携を始められません。本番サイトで、環境変数 THREADS_REDIRECT_URI に
          https://（本番のドメイン）/api/threads/callback を設定し、本番サイトから連携してください。
        </p>
      )}

      {status.configured && status.appId && !status.connected && (
        <p
          className={`mt-3 text-xs ${status.appIdLooksValid ? 'text-muted-foreground' : 'text-red-600'}`}
        >
          使用中の Threads App ID：
          <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">{status.appId}</code>
          {status.appIdLooksValid
            ? '（Metaの「App settings → Basic」の「Threads App ID」と一致しているか確認してください。ページ上部の「App ID」とは別の値です）'
            : '（数字だけの形式ではありません。環境変数を確認してください）'}
        </p>
      )}

      {status.configured && status.redirectUriIsSecure && !status.connected && status.redirectUri && (
        <p className="mt-3 text-xs text-muted-foreground">
          Metaの「有効なOAuthリダイレクトURI」には、次のURLを登録してください（このサイトから連携を始める必要があります）：
          <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">
            {status.redirectUri}
          </code>
        </p>
      )}

      {noticeInfo && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            noticeInfo.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-600'
          }`}
        >
          {noticeInfo.text}
          {noticeInfo.tone === 'error' && noticeDetail && (
            <span className="mt-1 block break-words text-xs text-red-700">
              Metaからの理由：{noticeDetail}
            </span>
          )}
        </p>
      )}

      {!status.configured && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Threads連携は未設定です。Metaのアプリを作成し、環境変数 THREADS_APP_ID / THREADS_APP_SECRET
          を設定すると、ここから連携できます（手順は docs/ai/threads-integration.md）。
        </p>
      )}

      {status.configured && status.connected && (
        <p className="mt-3 text-xs text-muted-foreground">
          連携中{status.username ? `：@${status.username}` : ''}
          {status.expiresAt &&
            `　トークンの有効期限：${formatJst(status.expiresAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}`}
          {status.expired && '（期限切れ。再連携してください）'}
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      {result && (
        <div className="mt-5 space-y-4 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {result.period}の分析
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {formatJst(result.createdAt, {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                に実施{result.id === null && '（保存されていません）'}
              </span>
            </p>

            {history.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">過去の分析：</span>

                {history.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setResult(report)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                      result.id === report.id
                        ? 'border-[#1478B8] bg-[#EAF4FA] text-[#1478B8]'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {formatJst(report.createdAt, { month: 'numeric', day: 'numeric' })}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">指標</th>
                  <th className="py-1.5 pr-3 font-medium">今週の投稿分</th>
                  <th className="py-1.5 font-medium">前回の投稿分</th>
                </tr>
              </thead>
              <tbody>
                {result.metrics.map((metric) => (
                  <tr key={metric.name} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{metric.name}</td>
                    <td className="py-1.5 pr-3 font-medium">{metric.value}</td>
                    <td className="py-1.5 text-muted-foreground">{metric.previousValue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {result.context}
          </p>

          <div className="space-y-3">
            <ReviewList label="良い傾向" items={result.review.highlights} />
            <ReviewList label="懸念" items={result.review.concerns} />
            <ReviewList label="仮説（未検証）" items={result.review.hypotheses} />
            <ReviewList label="改善の材料（決定ではありません）" items={result.review.improvementIdeas} />
            <ReviewList label="データの限界" items={result.review.dataLimitations} />
          </div>
        </div>
      )}
    </div>
  );
}
