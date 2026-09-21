'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Copy,
  Loader2,
  ShieldAlert,
  TriangleAlert,
  CircleCheck,
  CircleX,
  RotateCcw,
  Send,
  Sparkles,
  ChevronDown,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { countPostLength, MAX_POST_LENGTH } from '@/lib/ai/social/post-length';

import {
  EVIDENCE_LEVEL_LABELS,
  SOCIAL_BATCH_SIZE,
  SOCIAL_DRAFT_MAX_AUDIENCE_LENGTH,
  SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH,
  SOCIAL_DRAFT_MAX_TOPIC_LENGTH,
  SOCIAL_DRAFT_TONES,
  type SocialDraftTone,
  type SocialWorkflow,
} from '@/lib/ai/social/types';

import {
  approveSocialWorkflow,
  createWeeklySocialBatch,
  deleteSocialWorkflow,
  rejectSocialWorkflow,
  reviseSocialWorkflow,
  markSocialWorkflowPosted,
} from '@/lib/ai/social/actions';

type ErrorResponse = {
  error: string;
};

const STATUS_LABELS: Record<SocialWorkflow['status'], string> = {
  researching: 'リサーチ中…',
  planning: '企画中…',
  writing: '執筆中…',
  auditing: '検品中…',
  needs_revision: '要修正（検品で指摘あり）',
  pending_review: '確認待ち',
  approved: '承認済み（未投稿）',
  rejected: '却下済み',
  posted: '投稿済み',
};

// 一覧の並び順：対応が必要なものを上に出す
const STATUS_PRIORITY: Record<SocialWorkflow['status'], number> = {
  needs_revision: 0,
  pending_review: 1,
  approved: 2,
  researching: 3,
  planning: 3,
  writing: 3,
  auditing: 3,
  rejected: 4,
  posted: 5,
};

function sortWorkflows(workflows: SocialWorkflow[]): SocialWorkflow[] {
  return [...workflows].sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
}

function hashtagsToText(hashtags: string[]): string {
  return hashtags.join(' ');
}

function textToHashtags(text: string): string[] {
  return text
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

// Server Actionの失敗は結果（ActionResult）で受け取る。ここに来るのは、通信の失敗や
// 処理時間の超過など、結果を受け取れなかった場合のみ。Next.jsが本番で隠した
// メッセージ（定型文）は、意味がないので出さず、原因の見当を添えた文言にする。
function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof Error &&
    error.message &&
    !error.message.includes('Server Components render')
  ) {
    return error.message;
  }

  return `${fallback}（通信の失敗や、処理時間の超過の可能性があります）`;
}

// バーチャルオフィスの社員をクリックしたときに付与される ?focus= と、
// スクロール・ハイライト先のセクションの対応
const FOCUS_SECTION_MAP = {
  researcher: 'research',
  planner: 'plan',
  writer: 'draft',
  editor: 'audit',
} as const;

type FocusSection = (typeof FOCUS_SECTION_MAP)[keyof typeof FOCUS_SECTION_MAP];

export function SocialDraftForm({
  initialWorkflows,
  latestAnalysisAt,
}: {
  initialWorkflows: SocialWorkflow[];
  // 保存済みの最新のKPI分析の日時（ISO）。なければ null
  latestAnalysisAt: string | null;
}) {
  const searchParams = useSearchParams();

  const [workflows, setWorkflows] = useState<SocialWorkflow[]>(
    initialWorkflows
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    initialWorkflows[0]?.id ?? null
  );

  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState<SocialDraftTone>(SOCIAL_DRAFT_TONES[0]);
  const [promoteAtlas, setPromoteAtlas] = useState(true);
  const [observations, setObservations] = useState('');
  // 直近のKPI分析を、テーマ選定・企画の参考にするか（分析があれば、最初はオン）
  const [useAnalysis, setUseAnalysis] = useState(latestAnalysisAt !== null);

  const latestAnalysisLabel = latestAnalysisAt
    ? new Date(latestAnalysisAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const [showManualForm, setShowManualForm] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const [draftText, setDraftText] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [highlightedSection, setHighlightedSection] =
    useState<FocusSection | null>(null);

  const researchSectionRef = useRef<HTMLDivElement>(null);
  const planSectionRef = useRef<HTMLDivElement>(null);
  const draftSectionRef = useRef<HTMLDivElement>(null);
  const auditSectionRef = useRef<HTMLDivElement>(null);

  const sortedWorkflows = useMemo(() => sortWorkflows(workflows), [workflows]);
  const selectedWorkflow = useMemo(
    () => workflows.find((item) => item.id === selectedId) ?? null,
    [workflows, selectedId]
  );

  const characterCount = useMemo(
    () => countPostLength(draftText, textToHashtags(hashtagsText)),
    [draftText, hashtagsText]
  );

  // 選択中のワークフローが変わったら、編集欄をその内容で初期化する
  useEffect(() => {
    if (!selectedWorkflow) {
      setDraftText('');
      setHashtagsText('');
      return;
    }

    setDraftText(selectedWorkflow.draft);
    setHashtagsText(hashtagsToText(selectedWorkflow.hashtags));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkflow?.id]);

  // ?focus= が付いている場合、対象のワークフローを選択したうえで
  // 該当セクションへスクロール＋ハイライトする
  useEffect(() => {
    const focusRole = searchParams.get('focus');

    const section =
      focusRole && focusRole in FOCUS_SECTION_MAP
        ? FOCUS_SECTION_MAP[focusRole as keyof typeof FOCUS_SECTION_MAP]
        : null;

    if (!section) return;

    // 対応が必要な最新のワークフローを対象にする
    const target = sortedWorkflows[0];
    if (!target) return;

    setSelectedId(target.id);

    const sectionRef =
      section === 'research'
        ? researchSectionRef
        : section === 'plan'
          ? planSectionRef
          : section === 'audit'
            ? auditSectionRef
            : draftSectionRef;

    const timer = setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setHighlightedSection(section);
      setTimeout(() => setHighlightedSection(null), 2400);
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsertWorkflow = (next: SocialWorkflow) => {
    setWorkflows((current) => {
      const exists = current.some((item) => item.id === next.id);
      return exists
        ? current.map((item) => (item.id === next.id ? next : item))
        : [next, ...current];
    });
    setSelectedId(next.id);
  };

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isGenerating) return;

    setIsGenerating(true);
    setErrorMessage('');
    setCopied(false);

    try {
      const response = await fetch('/api/ai/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          audience,
          tone,
          promoteAtlas,
          observations: observations.trim() || undefined,
        }),
      });

      const data: SocialWorkflow | ErrorResponse = await response.json();

      if (!response.ok) {
        setErrorMessage(
          (data as ErrorResponse).error ?? '投稿案の作成に失敗しました。'
        );
        return;
      }

      upsertWorkflow(data as SocialWorkflow);
      setTopic('');
      setAudience('');
    } catch {
      setErrorMessage(
        '通信エラーが発生しました。ネットワーク状態を確認してもう一度お試しください。'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (isBatchGenerating) return;

    if (
      !window.confirm(
        `今週分として${SOCIAL_BATCH_SIZE}件の「感情が動いているテーマ」を見つけて投稿案を作成します。` +
          (observations.trim()
            ? 'Threadsの観測メモに基づいてテーマを選びます。'
            : 'Threadsの観測メモがないため、AIの見立て（仮説）でテーマを選びます。') +
          (useAnalysis && latestAnalysisLabel
            ? `直近のThreads分析（${latestAnalysisLabel}実施）を、テーマ・切り口の参考にします（仮説として扱われます）。`
            : '') +
          '数分かかることがあります。実行しますか？'
      )
    ) {
      return;
    }

    setIsBatchGenerating(true);
    setErrorMessage('');

    try {
      const result = await createWeeklySocialBatch(
        observations.trim() || undefined,
        useAnalysis && latestAnalysisAt !== null
      );

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      const created = result.data;
      setWorkflows((current) => [...created, ...current]);
      setSelectedId(created[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(
          error,
          '週次バッチの作成に失敗しました。もう一度お試しください。'
        )
      );
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleRevise = async () => {
    if (!selectedWorkflow || isActionPending) return;

    setIsActionPending(true);
    setErrorMessage('');

    try {
      const result = await reviseSocialWorkflow(selectedWorkflow.id);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      upsertWorkflow(result.data);
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(error, '再検品に失敗しました。もう一度お試しください。')
      );
    } finally {
      setIsActionPending(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWorkflow || isActionPending) return;

    setIsActionPending(true);
    setErrorMessage('');

    try {
      const result = await approveSocialWorkflow(selectedWorkflow.id, {
        draft: draftText,
        hashtags: textToHashtags(hashtagsText),
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      upsertWorkflow(result.data);
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(error, '承認に失敗しました。もう一度お試しください。')
      );
    } finally {
      setIsActionPending(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWorkflow || isActionPending) return;

    if (!window.confirm('この投稿案を却下しますか？')) return;

    setIsActionPending(true);
    setErrorMessage('');

    try {
      const result = await rejectSocialWorkflow(selectedWorkflow.id);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      upsertWorkflow(result.data);
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(error, '却下に失敗しました。もう一度お試しください。')
      );
    } finally {
      setIsActionPending(false);
    }
  };

  const handleMarkPosted = async () => {
    if (!selectedWorkflow || isActionPending) return;

    setIsActionPending(true);
    setErrorMessage('');

    try {
      const result = await markSocialWorkflowPosted(selectedWorkflow.id);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      upsertWorkflow(result.data);
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(
          error,
          '投稿済みへの更新に失敗しました。もう一度お試しください。'
        )
      );
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkflow || isActionPending) return;

    if (
      !window.confirm(
        `「${selectedWorkflow.topic}」を削除しますか？この操作は取り消せません。`
      )
    ) {
      return;
    }

    setIsActionPending(true);
    setErrorMessage('');

    try {
      const result = await deleteSocialWorkflow(selectedWorkflow.id);

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setWorkflows((current) =>
        current.filter((item) => item.id !== selectedWorkflow.id)
      );
      setSelectedId((current) => (current === selectedWorkflow.id ? null : current));
    } catch (error) {
      setErrorMessage(
        extractErrorMessage(error, '削除に失敗しました。もう一度お試しください。')
      );
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCopy = async () => {
    const content =
      hashtagsText.trim().length > 0
        ? `${draftText}\n\n${hashtagsText}`
        : draftText;

    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage(
        'コピーに失敗しました。テキストを選択して手動でコピーしてください。'
      );
    }
  };

  const research = selectedWorkflow?.researchResult ?? null;
  const plan = selectedWorkflow?.postPlan ?? null;
  const audit = selectedWorkflow?.auditResult ?? null;
  const status = selectedWorkflow?.status;
  const isEditable = status === 'pending_review';

  const needsAttentionCount = workflows.filter(
    (item) =>
      item.status === 'pending_review' || item.status === 'needs_revision'
  ).length;

  return (
    <div className="space-y-8">
      {/* 週次バッチ生成 */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />

            <div>
              <p className="text-sm font-semibold text-orange-900">
                今週分を自動で作成する
              </p>
              <p className="mt-1 text-xs text-orange-800">
                リサーチ担当が「感情が動いているテーマ」を見つけ、{SOCIAL_BATCH_SIZE}
                件（1日1投稿＋バッファ）の投稿案を作成します。数分かかることがあります。
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleBatchGenerate}
            disabled={isBatchGenerating}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              `今週分の${SOCIAL_BATCH_SIZE}件を作成`
            )}
          </Button>
        </div>

        <div className="mt-4">
          <Label
            htmlFor="observations"
            className="mb-1 block text-xs font-medium text-orange-900"
          >
            Threadsの観測メモ（任意・手動作成にも使われます）
          </Label>

          <textarea
            id="observations"
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            rows={4}
            maxLength={SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH}
            disabled={isBatchGenerating || isGenerating}
            placeholder={
              '直近7日間にThreadsで見かけた、反応・コメント・共感が多かった投稿や言葉を貼り付けてください。' +
              '個人を特定できる情報は入れないでください。'
            }
            className="w-full rounded-lg border border-orange-200 bg-white p-3 text-sm leading-6"
          />

          <p className="mt-1 text-xs text-orange-800">
            AIはThreadsを直接見られません。メモを入れると、その内容に基づいてテーマを選びます。
            入れない場合は、AIの見立て（仮説）としてテーマを選び、そのことが結果に表示されます。
          </p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm text-orange-900">
          <input
            type="checkbox"
            checked={useAnalysis && latestAnalysisAt !== null}
            onChange={(event) => setUseAnalysis(event.target.checked)}
            disabled={latestAnalysisAt === null || isBatchGenerating}
            className="mt-0.5 h-4 w-4 rounded border-orange-300"
          />

          <span>
            直近のThreads分析を、テーマ・切り口の参考にする
            <span className="mt-0.5 block text-xs text-orange-800">
              {latestAnalysisLabel === null
                ? 'まだ分析がありません。上の「Threads連携（分析担当）」で「今週の数字を分析する」を実行すると、選べます。'
                : `${latestAnalysisLabel}に実施した分析を使います。サンプルが小さいため、仮説（参考情報）として扱われ、テーマは分析に偏らないよう、多様に選ばれます。`}
            </span>
          </span>
        </label>
      </div>

      {/* 手動で1件作成（折りたたみ） */}
      <div className="rounded-xl border">
        <button
          type="button"
          onClick={() => setShowManualForm((current) => !current)}
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
        >
          手動でテーマを指定して1件作成する
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              showManualForm ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showManualForm && (
          <form onSubmit={handleGenerate} className="space-y-6 px-5 pb-5">
            <div>
              <Label
                htmlFor="topic"
                className="mb-2 block text-sm font-medium"
              >
                投稿テーマ
              </Label>

              <Input
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="例：海外赴任が決まった家族が最初に困ったこと"
                maxLength={SOCIAL_DRAFT_MAX_TOPIC_LENGTH}
                disabled={isGenerating}
                required
              />
            </div>

            <div>
              <Label
                htmlFor="audience"
                className="mb-2 block text-sm font-medium"
              >
                想定読者
              </Label>

              <Input
                id="audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="例：海外赴任が決まった人とその家族"
                maxLength={SOCIAL_DRAFT_MAX_AUDIENCE_LENGTH}
                disabled={isGenerating}
                required
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">
                投稿案のトーン
              </Label>

              <div className="flex flex-wrap gap-2">
                {SOCIAL_DRAFT_TONES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setTone(option)}
                    className={
                      tone === option
                        ? 'rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white'
                        : 'rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={promoteAtlas}
                onChange={(event) => setPromoteAtlas(event.target.checked)}
                disabled={isGenerating}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />

              <span>利用者にAtlasを紹介する投稿にする</span>
            </label>

            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  リサーチ・企画・執筆・検品を実行中...
                </>
              ) : (
                'この1件を作成'
              )}
            </Button>
          </form>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* 一覧 */}
      {workflows.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              投稿案一覧（{workflows.length}件）
            </p>

            {needsAttentionCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                対応が必要：{needsAttentionCount}件
              </span>
            )}
          </div>

          <div className="space-y-2">
            {sortedWorkflows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`block w-full rounded-lg border p-3 text-left transition ${
                  item.id === selectedId
                    ? 'border-orange-400 bg-orange-50/60'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {item.topic}
                  </p>

                  <span className="shrink-0 rounded-full bg-gray-900 px-2.5 py-0.5 text-xs text-white">
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.audience} ・{' '}
                  {new Date(item.updatedAt).toLocaleString('ja-JP')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 選択中のワークフロー詳細 */}
      {selectedWorkflow && (
        <div className="space-y-6 border-t pt-6">
          {/* ステータス */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
              状態: {STATUS_LABELS[selectedWorkflow.status]}
            </span>

            <span className="text-xs text-muted-foreground">
              ワークフローID: {selectedWorkflow.id}
            </span>
          </div>

          {/* リサーチ結果 */}
          {research && (
            <div
              ref={researchSectionRef}
              className={`rounded-lg ring-2 ring-offset-2 transition-shadow duration-700 ${
                highlightedSection === 'research'
                  ? 'ring-orange-400'
                  : 'ring-transparent'
              }`}
            >
              <details className="rounded-lg border bg-gray-50 p-4" open>
                <summary className="cursor-pointer text-sm font-medium">
                  リサーチ結果
                </summary>

                <div className="mt-3 space-y-3 text-sm">
                  {research.resonance && (
                    <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-orange-900">
                          感情が動いているテーマ
                        </p>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            research.resonance.evidenceLevel === 'observed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {EVIDENCE_LEVEL_LABELS[research.resonance.evidenceLevel]}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground">テーマ</p>
                        <p className="text-sm">{selectedWorkflow?.topic}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          なぜ反応されたか
                        </p>
                        <p className="text-sm">{research.resonance.whyItResonated}</p>
                      </div>

                      <ResearchList
                        label="どんな感情があるか"
                        items={research.resonance.emotions}
                      />

                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Atlas視点の切り口
                        </p>
                        <p className="text-sm">{research.resonance.atlasAngle}</p>
                      </div>

                      <ResearchList
                        label="経験投稿につながる問い"
                        items={research.resonance.experienceQuestions}
                      />

                      <p className="text-xs text-muted-foreground">
                        根拠: {research.resonance.evidenceNote}
                      </p>
                    </div>
                  )}

                  <ResearchList label="読者の悩み" items={research.readerConcerns} />
                  <ResearchList label="読者が反応している言葉" items={research.keywords} />
                  <ResearchList label="経験を語れる論点" items={research.talkingPoints} />
                  <ResearchList
                    label="事実確認が必要な内容"
                    items={research.factsToVerify}
                  />
                  <ResearchList
                    label="使用してはいけない未確認情報"
                    items={research.unverifiedClaimsToAvoid}
                  />
                  <ResearchList
                    label="Atlasを紹介できる接点"
                    items={research.atlasConnectionIdeas}
                  />
                  <ResearchList label="情報源" items={research.sources} />
                </div>
              </details>
            </div>
          )}

          {/* 企画結果 */}
          {plan && (
            <div
              ref={planSectionRef}
              className={`rounded-lg ring-2 ring-offset-2 transition-shadow duration-700 ${
                highlightedSection === 'plan'
                  ? 'ring-orange-400'
                  : 'ring-transparent'
              }`}
            >
              <details className="rounded-lg border bg-gray-50 p-4" open>
                <summary className="cursor-pointer text-sm font-medium">
                  企画結果
                </summary>

                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">採用した切り口</p>
                    <p className="text-sm">{plan.angle}</p>
                  </div>

                  <ResearchList label="検討した切り口の選択肢" items={plan.angleOptions} />
                  <ResearchList label="構成" items={plan.structure} />

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">投稿方針</p>
                    <p className="text-sm">{plan.policy}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">採用理由</p>
                    <p className="text-sm">{plan.rationale}</p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* 投稿案 */}
          <div
            ref={draftSectionRef}
            className={`rounded-lg ring-2 ring-offset-2 transition-shadow duration-700 ${
              highlightedSection === 'draft'
                ? 'ring-orange-400'
                : 'ring-transparent'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="draft-content" className="text-sm font-medium">
                投稿案（本文・編集可能）
              </Label>

              <span
                className={`text-xs ${
                  characterCount > MAX_POST_LENGTH
                    ? 'font-semibold text-red-600'
                    : 'text-muted-foreground'
                }`}
              >
                {characterCount}/{MAX_POST_LENGTH}文字（ハッシュタグ込み）
                {characterCount > MAX_POST_LENGTH && ' 超過しています。削ってください'}
              </span>
            </div>

            <textarea
              id="draft-content"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={8}
              disabled={!isEditable}
              className="w-full rounded-lg border p-3 text-sm leading-6 disabled:bg-gray-50 disabled:text-gray-500"
            />

            <div className="mt-3">
              <Label
                htmlFor="hashtags-content"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                ハッシュタグ（スペース区切り・編集可能）
              </Label>

              <Input
                id="hashtags-content"
                value={hashtagsText}
                onChange={(event) => setHashtagsText(event.target.value)}
                disabled={!isEditable}
                placeholder="#Atlas #海外赴任"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={!draftText}
              >
                <Copy className="h-4 w-4" />
                {copied ? 'コピーしました' : 'コピー'}
              </Button>
            </div>
          </div>

          {/* 検品結果 */}
          {audit && (
            <div
              ref={auditSectionRef}
              className={`rounded-lg border p-4 ring-2 ring-offset-2 transition-shadow duration-700 ${
                highlightedSection === 'audit'
                  ? 'ring-orange-400'
                  : 'ring-transparent'
              }`}
            >
              <p className="mb-2 text-sm font-medium">検品結果</p>

              <p className="mb-3 text-sm">
                判定：
                <span
                  className={
                    audit.auditStatus === 'pass'
                      ? 'ml-1 font-medium text-green-700'
                      : 'ml-1 font-medium text-red-700'
                  }
                >
                  {audit.auditStatus === 'pass' ? '合格' : '要修正'}
                </span>
              </p>

              <ResearchList label="コメント" items={audit.auditComments} />
              <ResearchList label="注意点" items={audit.warnings} />

              {audit.auditStatus === 'needs_revision' && (
                <ResearchList
                  label="ライターへの修正案"
                  items={audit.suggestedChanges}
                />
              )}
            </div>
          )}

          {/* 承認前の注意表示 */}
          {status === 'pending_review' && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              この投稿案は確認待ちです。承認するまで投稿処理は実行されません。
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

            <p>
              この投稿案はAIが作成したたたき台です。事実関係・表現・誇張や断定的な言い回しがないかを必ず人間が確認し、
              承認後はThreadsへ手動で投稿してください。このシステムがThreadsへ自動投稿することはありません。
            </p>
          </div>

          {/* アクション */}
          <div className="flex flex-wrap items-center gap-3">
            {status === 'needs_revision' && (
              <Button
                type="button"
                onClick={handleRevise}
                disabled={isActionPending}
              >
                {isActionPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                修正して再検品
              </Button>
            )}

            {status === 'pending_review' && (
              <>
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={isActionPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isActionPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CircleCheck className="h-4 w-4" />
                  )}
                  承認する
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isActionPending}
                >
                  <CircleX className="h-4 w-4" />
                  却下する
                </Button>
              </>
            )}

            {status === 'approved' && (
              <Button
                type="button"
                onClick={handleMarkPosted}
                disabled={isActionPending}
              >
                {isActionPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                投稿済みにする
              </Button>
            )}

            {status === 'rejected' && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TriangleAlert className="h-4 w-4" />
                この投稿案は却下されました。
              </p>
            )}

            {status === 'posted' && (
              <p className="flex items-center gap-1.5 text-sm text-green-700">
                <CircleCheck className="h-4 w-4" />
                投稿済みとして記録されています。
                {selectedWorkflow.postedAt &&
                  `（${new Date(selectedWorkflow.postedAt).toLocaleString('ja-JP')}）`}
              </p>
            )}

            {status !== 'posted' && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isActionPending}
                className="ml-auto text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                この投稿案を削除
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResearchList({ label, items }: { label: string; items: string[] }) {
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
