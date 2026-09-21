'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { deleteMeeting } from '@/lib/ai/management/actions';

import {
  MAX_TOPIC_LENGTH,
  type Meeting,
  type MeetingStage,
} from '@/lib/ai/management/types';

const STAGE_LABELS: Record<MeetingStage, string> = {
  framing: '社長が案件整理中…',
  discussing: '経営判断室が議論中…',
  awaiting_owner_input: '会長への質問あり',
  drafting_proposal: '一次案を作成中…',
  auditing_proposal: '監査室がレビュー中…',
  needs_rework: '一次案を作り直し中…',
  summarizing: '社長が総括中…',
  awaiting_owner_decision: '会長の判断待ち',
  closed: '判断済み',
};

const NEEDS_ATTENTION_STAGES: MeetingStage[] = [
  'awaiting_owner_input',
  'awaiting_owner_decision',
];

type ErrorResponse = { error: string };

export function MeetingListAndForm({
  initialMeetings,
}: {
  initialMeetings: Meeting[];
}) {
  const router = useRouter();

  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [topic, setTopic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (meeting: Meeting) => {
    if (deletingId !== null) return;

    if (
      !window.confirm(
        `会議「${meeting.topic}」を削除しますか？\n議論の記録もすべて削除され、元に戻せません。`
      )
    ) {
      return;
    }

    setDeletingId(meeting.id);
    setErrorMessage('');

    try {
      const result = await deleteMeeting(meeting.id);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setMeetings((current) => current.filter((item) => item.id !== meeting.id));
      // オフィストップの会議室パネルの表示も更新する
      router.refresh();
    } catch {
      setErrorMessage(
        '削除が完了しませんでした（通信の失敗の可能性があります）。ページを再読み込みして、削除されたか確認してください。'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isCreating) return;

    setIsCreating(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/office/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data: Meeting | ErrorResponse = await response.json();

      if (!response.ok) {
        setErrorMessage(
          (data as ErrorResponse).error ?? '会議の作成に失敗しました。'
        );
        return;
      }

      const created = data as Meeting;
      setMeetings((current) => [created, ...current]);
      setTopic('');
      router.push(`/office/meeting/${created.id}`);
    } catch {
      setErrorMessage(
        '通信エラーが発生しました。ネットワーク状態を確認してもう一度お試しください。'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="space-y-4 rounded-xl border border-orange-200 bg-orange-50 p-5"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />

          <div className="min-w-0 flex-1">
            <Label htmlFor="meeting-topic" className="mb-2 block text-sm font-semibold text-orange-900">
              案件を投入する
            </Label>

            <p className="mb-3 text-xs text-orange-800">
              例：「経験投稿を増やしたい」「Threads流入が弱い」「新機能を作るべきか」
            </p>

            <textarea
              id="meeting-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={MAX_TOPIC_LENGTH}
              rows={3}
              disabled={isCreating}
              placeholder="案件を具体的に入力してください"
              className="w-full rounded-lg border p-3 text-sm leading-6"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isCreating}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                社長が整理・経営判断室が議論中...
              </>
            ) : (
              '会議を開く'
            )}
          </Button>
        </div>
      </form>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ会議がありません。</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">会議一覧（{meetings.length}件）</p>

          {meetings.map((meeting) => (
            <div key={meeting.id} className="flex items-stretch gap-2">
              <Link href={`/office/meeting/${meeting.id}`} className="block min-w-0 flex-1">
                <div className="rounded-lg border p-3 transition hover:bg-muted">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {meeting.topic}
                    </p>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs text-white ${
                        NEEDS_ATTENTION_STAGES.includes(meeting.stage)
                          ? 'bg-orange-500'
                          : meeting.stage === 'closed'
                            ? 'bg-emerald-600'
                            : 'bg-gray-900'
                      }`}
                    >
                      {STAGE_LABELS[meeting.stage]}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(meeting.updatedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleDelete(meeting)}
                disabled={deletingId !== null}
                aria-label={`会議「${meeting.topic}」を削除する`}
                title="この会議を削除する"
                className="flex w-10 shrink-0 items-center justify-center rounded-lg border text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === meeting.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
