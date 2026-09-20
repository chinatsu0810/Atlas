'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageCircleQuestion, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import type {
  MeetingMessage,
  MeetingStage,
  MeetingWithMessages,
} from '@/lib/ai/management/types';
import {
  answerMeetingQuestions,
  closeMeetingWithOwnerDecision,
} from '@/lib/ai/management/actions';
import { getEmployeeById } from '@/lib/ai/employees';

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

const STAGE_SECTION_LABELS: Record<MeetingStage, string> = {
  framing: '① 社長による案件整理',
  discussing: '② 経営判断室の議論',
  awaiting_owner_input: '③ 会長への質問',
  drafting_proposal: '④ 経営判断室の一次案',
  auditing_proposal: '⑤ 監査室のレビュー',
  needs_rework: '差し戻し',
  summarizing: '⑥ 社長の総括',
  awaiting_owner_decision: '⑦ 会長への返却',
  closed: '会長の判断',
};

const FIELD_LABELS: Record<string, string> = {
  currentSituation: '現状',
  issues: '課題',
  hypotheses: '仮説',
  decisionPoints: '判断したいこと',
  chain: 'なぜの掘り下げ',
  question: 'なぜ',
  answer: '回答',
  facts: '事実',
  assumptions: '仮説・前提',
  questionsForOwner: '会長への質問',
  options: '選択肢',
  option: '選択肢',
  prosAndCons: 'メリット・デメリット',
  pros: 'メリット',
  cons: 'デメリット',
  risks: 'リスク',
  judgmentMaterials: '判断材料',
  challengedAssumptions: '疑問を呈する前提',
  alternatives: '別解・代案',
  userValue: '利用者にとっての価値',
  userConcerns: '利用者視点の懸念',
  successCriteria: '成功条件',
  exitCriteria: '撤退条件',
  evaluationPeriod: '評価期間',
  openQuestions: '未確認・未解決事項',
  verdict: '判定',
  comments: 'コメント',
  kpiValidityNotes: 'KPI妥当性・前提確認',
  reworkRequests: '差し戻し内容',
  keyPoints: '論点',
  questions: '質問',
  answers: '回答',
  text: '',
  decision: '会長の判断',
  note: 'メモ',
  rationale: '理由',
};

function humanizeLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function FieldBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    return (
      <div>
        {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
        <p className="whitespace-pre-wrap text-sm">{value}</p>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">なし</p>
        </div>
      );
    }

    if (typeof value[0] === 'string') {
      return (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <ul className="list-inside list-disc space-y-0.5">
            {(value as string[]).map((item, index) => (
              <li key={index} className="text-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <div className="space-y-2">
          {(value as Record<string, unknown>[]).map((item, index) => (
            <div key={index} className="space-y-1.5 rounded-lg border bg-gray-50 p-2.5">
              {Object.entries(item).map(([key, val]) => (
                <FieldBlock key={key} label={humanizeLabel(key)} value={val} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="space-y-1.5">
        {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
        {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
          <FieldBlock key={key} label={humanizeLabel(key)} value={val} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{String(value)}</p>
    </div>
  );
}

function authorLabel(message: MeetingMessage): string {
  if (message.authorType === 'owner') return '会長';
  if (message.authorType === 'system') return 'システム';

  const employee = message.employeeId ? getEmployeeById(message.employeeId) : null;
  return employee ? `${employee.name}（${employee.role}）` : '不明';
}

function MessageCard({ message }: { message: MeetingMessage }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#123B5D]">{authorLabel(message)}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleString('ja-JP')}
        </p>
      </div>

      <div className="space-y-2">
        {message.content && typeof message.content === 'object' ? (
          Object.entries(message.content as Record<string, unknown>).map(([key, value]) => (
            <FieldBlock key={key} label={humanizeLabel(key)} value={value} />
          ))
        ) : (
          <p className="text-sm">{String(message.content)}</p>
        )}
      </div>
    </div>
  );
}

function groupByStage(messages: MeetingMessage[]) {
  const groups: { stage: MeetingStage; messages: MeetingMessage[] }[] = [];

  for (const message of messages) {
    const last = groups[groups.length - 1];

    if (last && last.stage === message.stage) {
      last.messages.push(message);
    } else {
      groups.push({ stage: message.stage, messages: [message] });
    }
  }

  return groups;
}

export function MeetingView({
  initialMeeting,
}: {
  initialMeeting: MeetingWithMessages;
}) {
  const [meeting, setMeeting] = useState<MeetingWithMessages>(initialMeeting);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [decisionDraft, setDecisionDraft] = useState('');

  const groups = useMemo(() => groupByStage(meeting.messages), [meeting.messages]);

  const pendingQuestions = useMemo(() => {
    if (meeting.stage !== 'awaiting_owner_input') return [];

    const lastQuestionMessage = [...meeting.messages]
      .reverse()
      .find(
        (message) =>
          message.authorType === 'system' && message.stage === 'awaiting_owner_input'
      );

    const content = lastQuestionMessage?.content as { questions?: string[] } | undefined;
    return content?.questions ?? [];
  }, [meeting]);

  const handleAnswerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) return;

    const answers = pendingQuestions.map((question) => ({
      question,
      answer: (answerDrafts[question] ?? '').trim(),
    }));

    if (answers.some((item) => !item.answer)) {
      setErrorMessage('すべての質問に回答してください。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const updated = await answerMeetingQuestions(meeting.id, { answers });
      setMeeting(updated);
      setAnswerDrafts({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '回答の送信に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecisionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const updated = await closeMeetingWithOwnerDecision(meeting.id, {
        decision: decisionDraft,
      });
      setMeeting(updated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '判断の記録に失敗しました。もう一度お試しください。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/office/meeting"
        className="mb-5 inline-flex items-center gap-2 text-sm text-[#6B8498] hover:text-[#123B5D]"
      >
        <ArrowLeft className="h-4 w-4" />
        会議室へ戻る
      </Link>

      <div className="mb-6">
        <span className="mb-2 inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
          {STAGE_LABELS[meeting.stage]}
        </span>

        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{meeting.topic}</h1>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group, index) => (
          <div key={index}>
            <p className="mb-3 text-xs font-semibold tracking-wide text-[#6B8498]">
              {STAGE_SECTION_LABELS[group.stage]}
            </p>

            <div className="space-y-3">
              {group.messages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {meeting.stage === 'awaiting_owner_input' && pendingQuestions.length > 0 && (
        <form
          onSubmit={handleAnswerSubmit}
          className="mt-8 space-y-4 rounded-xl border border-orange-200 bg-orange-50 p-5"
        >
          <div className="flex items-start gap-3">
            <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />

            <p className="text-sm font-semibold text-orange-900">
              経営判断室から会長への質問に回答してください
            </p>
          </div>

          {pendingQuestions.map((question, index) => (
            <div key={index}>
              <Label className="mb-1 block text-sm font-medium">{question}</Label>

              <textarea
                value={answerDrafts[question] ?? ''}
                onChange={(event) =>
                  setAnswerDrafts((current) => ({
                    ...current,
                    [question]: event.target.value,
                  }))
                }
                rows={2}
                disabled={isSubmitting}
                className="w-full rounded-lg border p-2.5 text-sm leading-6"
              />
            </div>
          ))}

          <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            回答して議論を再開する
          </Button>
        </form>
      )}

      {meeting.stage === 'awaiting_owner_decision' && (
        <form
          onSubmit={handleDecisionSubmit}
          className="mt-8 space-y-4 rounded-xl border border-orange-200 bg-orange-50 p-5"
        >
          <p className="text-sm font-semibold text-orange-900">会長、どう判断しますか？</p>

          <textarea
            value={decisionDraft}
            onChange={(event) => setDecisionDraft(event.target.value)}
            rows={4}
            disabled={isSubmitting}
            placeholder="判断内容を入力してください"
            className="w-full rounded-lg border p-3 text-sm leading-6"
            required
          />

          <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            判断を記録する
          </Button>
        </form>
      )}

      {meeting.stage === 'closed' && meeting.ownerDecision && (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="mb-2 text-sm font-semibold text-emerald-900">会長の判断</p>
          <p className="whitespace-pre-wrap text-sm text-emerald-900">{meeting.ownerDecision}</p>
        </div>
      )}
    </main>
  );
}
