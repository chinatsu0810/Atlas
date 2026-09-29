'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Eye, Loader2, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';

import {
  advancePlaceGuide,
  approvePlaceGuidePlan,
  deletePlaceGuide,
  publishPlaceGuide,
  restartPlaceGuide,
  savePlaceGuideDraft,
  unpublishPlaceGuide,
} from '@/lib/ai/guides/actions';
import type { PlaceGuide } from '@/lib/ai/guides/queries';
import {
  AUTO_STEPS,
  COMPARISON_SECTION,
  FACT_VERDICT_LABELS,
  GUIDE_BUDGET_ERROR,
  HIGHLIGHT_SECTION,
  SOURCE_KINDS,
  SOURCE_KIND_LABELS,
  TOKEN_BUDGET_PER_GUIDE,
  usedTokens,
  type GuideContent,
  type GuideItem,
  type GuidePlan,
  type GuideSource,
  type GuideStatus,
  type SourceKind,
} from '@/lib/ai/guides/types';
import { GuideSummary } from '@/components/places/guide-summary';
import { USD_TO_JPY } from '@/lib/ai/core/usage';

const STEPS: { status: GuideStatus; label: string; who: string }[] = [
  { status: 'planning', label: '企画', who: 'ヘンシュウ' },
  { status: 'plan_review', label: '企画の確認', who: 'あなた' },
  { status: 'researching', label: '調査', who: 'シラベ' },
  { status: 'checking', label: '正誤チェック', who: 'タシカ' },
  { status: 'writing', label: '執筆', who: 'マトメ' },
  { status: 'reviewing', label: '審査', who: 'チュウリツ' },
  { status: 'pending_review', label: '本文の確認', who: 'あなた' },
  { status: 'published', label: '公開', who: '' },
];

// 他の画面などで作業中のとき、進み具合を確かめる間隔
const POLL_MS = 15_000;

const buttonPrimary =
  'inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1478B8] px-5 text-sm font-semibold text-white transition hover:bg-[#0D5686] disabled:opacity-50';
const buttonSecondary =
  'inline-flex h-10 items-center gap-1.5 rounded-full border border-[#9EC6DF] bg-white px-5 text-sm font-semibold text-[#1478B8] transition hover:bg-[#F1F8FC] disabled:opacity-50';
const inputClass =
  'w-full rounded-lg border border-[#D8E7F0] px-3 py-2 text-base text-[#174C73] outline-none focus:border-[#1478B8] sm:text-sm';
const removeButton =
  'shrink-0 rounded-full p-2 text-[#7F9AAD] hover:bg-[#FDECEC] hover:text-[#D14343]';
const addButton = 'inline-flex items-center gap-1 text-xs font-semibold text-[#1478B8]';

function Stepper({ guide, working }: { guide: PlaceGuide; working: boolean }) {
  const current = STEPS.findIndex((step) => step.status === guide.status);

  return (
    <ol className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
      {STEPS.map((step, index) => {
        const done = index < current;
        const now = index === current;
        return (
          <li
            key={step.status}
            className={`rounded-xl border px-1.5 py-2 text-center ${
              now
                ? guide.error
                  ? 'border-[#F2B8B8] bg-[#FDECEC]'
                  : 'border-[#1478B8] bg-[#EAF4FB]'
                : done
                  ? 'border-[#CFE8E3] bg-[#F4FBF8]'
                  : 'border-[#E1EBF1] bg-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#174C73] sm:text-xs">
              {done && <Check className="h-3.5 w-3.5 text-[#1F5F5B]" />}
              {now && working && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1478B8]" />}
              {now && guide.error && <AlertTriangle className="h-3.5 w-3.5 text-[#D14343]" />}
              {step.label}
            </span>
            {step.who && <span className="block text-[10px] text-[#7F95A6]">{step.who}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function formatYen(usd: number) {
  return `約${Math.round(usd * USD_TO_JPY).toLocaleString('ja-JP')}円`;
}

// この1本にかかった費用の目安（段階ごと）。正確な請求額は Anthropic の管理画面で確認する
function CostPanel({ guide }: { guide: PlaceGuide }) {
  if (guide.usage.length === 0) return null;
  const total = guide.usage.reduce((sum, entry) => sum + entry.costUsd, 0);
  const labelOf = (step: GuideStatus) => STEPS.find((item) => item.status === step)?.label ?? step;

  return (
    <details className="mt-4 rounded-xl border border-[#E1EBF1] bg-white px-4 py-3">
      <summary className="cursor-pointer text-sm">
        <span className="font-semibold">この1本の費用の目安：{formatYen(total)}</span>
        <span className="ml-2 text-xs text-[#7F95A6]">
          （${total.toFixed(2)}・{usedTokens(guide.usage).toLocaleString('ja-JP')}トークン・1ドル{USD_TO_JPY}円で計算）
        </span>
      </summary>
      <table className="mt-3 w-full text-xs">
        <thead className="text-left text-[#7F95A6]">
          <tr>
            <th className="py-1 font-normal">段階</th>
            <th className="py-1 font-normal">費用</th>
            <th className="py-1 font-normal">読んだ量</th>
            <th className="py-1 font-normal">書いた量</th>
            <th className="py-1 font-normal">検索・取得</th>
          </tr>
        </thead>
        <tbody className="text-[#29465C]">
          {guide.usage.map((entry, index) => (
            <tr key={index} className="border-t border-[#EEF3F6]">
              <td className="py-1.5">{labelOf(entry.step)}</td>
              <td className="py-1.5">{formatYen(entry.costUsd)}</td>
              <td className="py-1.5">
                {(entry.inputTokens + entry.cacheCreationTokens + entry.cacheReadTokens).toLocaleString('ja-JP')}
              </td>
              <td className="py-1.5">{entry.outputTokens.toLocaleString('ja-JP')}</td>
              <td className="py-1.5">
                {entry.webSearches}回・{entry.webFetches}件
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-[#7F95A6]">
        量はトークン数。公開価格から計算した目安で、正確な請求額は Anthropic の管理画面（Usage / Cost）で確認してください。
      </p>
    </details>
  );
}

function PlanView({ plan }: { plan: GuidePlan }) {
  return (
    <div className="space-y-3 text-sm">
      {plan.comparison ? (
        <div>
          <p className="font-semibold">比べるカード：{plan.comparison.title}</p>
          <p className="text-xs text-[#406783]">選択肢：{plan.comparison.options.join('／')}</p>
          <p className="text-xs text-[#406783]">項目：{plan.comparison.attributes.join('／')}</p>
        </div>
      ) : (
        <p className="text-xs text-[#7F95A6]">比べるカードは無し</p>
      )}
      {plan.topics.map((topic) => (
        <div key={topic.key}>
          <p className="font-semibold">{topic.heading}</p>
          <ul className="list-disc pl-5 text-xs text-[#406783]">
            {topic.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WorkLog({ guide }: { guide: PlaceGuide }) {
  const verdictOf = (factId: number) => guide.factCheck?.results.find((result) => result.factId === factId);
  const sourceOf = (id: number) => guide.research?.sources.find((source) => source.id === id);
  const topicHeading = (key: string) => guide.plan?.topics.find((topic) => topic.key === key)?.heading ?? key;
  const whereOf = (fact: { section: string; option: string; attribute: string }) =>
    fact.section === COMPARISON_SECTION
      ? `比べる：${fact.option} × ${fact.attribute}`
      : fact.section === HIGHLIGHT_SECTION
        ? 'まず知っておきたいこと'
        : topicHeading(fact.section);

  return (
    <div className="mt-6 space-y-3">
      {guide.plan && guide.status !== 'plan_review' && (
        <details className="rounded-xl border border-[#E1EBF1] bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">企画</summary>
          <div className="mt-3">
            <PlanView plan={guide.plan} />
          </div>
        </details>
      )}

      {guide.research && (
        <details className="rounded-xl border border-[#E1EBF1] bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">
            調査（シラベ）・正誤チェック（タシカ）：情報 {guide.research.facts.length}件
            {guide.research.droppedCount > 0 && `（出典が確認できず除いたもの ${guide.research.droppedCount}件）`}
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {guide.research.facts.map((fact) => {
              const verdict = verdictOf(fact.id);
              const source = sourceOf(fact.sourceId);
              return (
                <li key={fact.id} className="rounded-lg bg-[#F8FBFD] px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#6B8498]">{whereOf(fact)}</p>
                  <p>{fact.claim}</p>
                  {source && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-[11px] text-[#1478B8] hover:underline"
                    >
                      [{SOURCE_KIND_LABELS[source.kind]}] {source.title}
                    </a>
                  )}
                  {verdict && (
                    <p
                      className={`mt-1 text-[11px] font-semibold ${
                        verdict.verdict === 'confirmed' ? 'text-[#1F5F5B]' : 'text-[#B45309]'
                      }`}
                    >
                      {FACT_VERDICT_LABELS[verdict.verdict]}：<span className="font-normal">{verdict.note}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {guide.review && (
        <details open={!guide.review.passed} className="rounded-xl border border-[#E1EBF1] bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">
            審査（チュウリツ）：{guide.review.passed ? '合格' : `指摘 ${guide.review.issues.length}件`}
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {guide.review.issues.map((issue, index) => (
              <li key={index} className="rounded-lg bg-[#FFF8EE] px-3 py-2">
                <p className="text-xs font-semibold text-[#8A5A12]">{issue.where}</p>
                <p>{issue.problem}</p>
                <p className="text-xs text-[#406783]">→ {issue.suggestion}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// 文字の一覧（選択肢・項目・問い）を、1行ずつ編集する
function ListEditor({
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            value={value}
            onChange={(e) => onChange(values.map((item, i) => (i === index ? e.target.value : item)))}
            placeholder={placeholder}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            className={removeButton}
            aria-label="消す"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])} className={addButton}>
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

// 企画の確認。会長が手直ししてから調査に進むか、コメントを付けて作り直してもらう
function PlanEditor({ guide, onChange, onRun }: { guide: PlaceGuide; onChange: (guide: PlaceGuide) => void; onRun: () => void }) {
  const [plan, setPlan] = useState<GuidePlan>(guide.plan ?? { comparison: null, topics: [] });
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const comparison = plan.comparison;
  const setComparison = (patch: Partial<NonNullable<GuidePlan['comparison']>>) =>
    setPlan({ ...plan, comparison: comparison ? { ...comparison, ...patch } : null });
  const setTopic = (index: number, patch: Partial<GuidePlan['topics'][number]>) =>
    setPlan({ ...plan, topics: plan.topics.map((topic, i) => (i === index ? { ...topic, ...patch } : topic)) });

  const approve = () =>
    startTransition(async () => {
      const result = await approvePlaceGuidePlan(guide.id, plan);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      onChange(result.data);
      onRun();
    });

  const replan = () =>
    startTransition(async () => {
      if (!feedback.trim()) {
        setMessage('作り直してほしい点を、コメントに書いてください。');
        return;
      }
      const result = await restartPlaceGuide(guide.id, 'planning', feedback);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      onChange(result.data);
      onRun();
    });

  return (
    <section className="mt-8 rounded-2xl border border-[#1478B8] bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">企画の確認</h2>
      <p className="mt-1 text-xs text-[#6B8498]">
        ヘンシュウの企画です。ここで直した内容のとおりに、調査・執筆が進みます。調査に進むと費用がかかるので、ここで絞り込んでください。
      </p>

      <div className="mt-5 rounded-xl border border-[#E1EBF1] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">比べるカード</p>
          <button
            type="button"
            onClick={() =>
              setPlan({
                ...plan,
                comparison: comparison ? null : { title: '種類ごとの違い', options: ['', ''], attributes: [''] },
              })
            }
            className="text-xs text-[#1478B8]"
          >
            {comparison ? '比べるカードを使わない' : '比べるカードを使う'}
          </button>
        </div>
        {comparison ? (
          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr]">
            <label className="block text-xs font-semibold text-[#406783] md:col-span-2">
              見出し
              <input
                value={comparison.title}
                onChange={(e) => setComparison({ title: e.target.value })}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#406783]">選択肢（カード1枚ずつ。3つまでが目安）</p>
              <ListEditor
                values={comparison.options}
                onChange={(options) => setComparison({ options })}
                placeholder="例：日本人学校"
                addLabel="選択肢を足す"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#406783]">項目（全カード共通。この順で並ぶ）</p>
              <ListEditor
                values={comparison.attributes}
                onChange={(attributes) => setComparison({ attributes })}
                placeholder="例：授業の言語"
                addLabel="項目を足す"
              />
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#7F95A6]">比べるものが無いテーマでは使いません。</p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold">テーマ別の情報</p>
        {plan.topics.map((topic, index) => (
          <div key={index} className="rounded-xl border border-[#E1EBF1] p-4">
            <div className="flex items-center gap-2">
              <input
                value={topic.heading}
                onChange={(e) => setTopic(index, { heading: e.target.value })}
                placeholder="見出し（例：費用）"
                className={`${inputClass} font-semibold`}
              />
              <button
                type="button"
                onClick={() => setPlan({ ...plan, topics: plan.topics.filter((_, i) => i !== index) })}
                className={removeButton}
                aria-label="見出しを消す"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-1.5 mt-3 text-xs font-semibold text-[#406783]">調べる問い</p>
            <ListEditor
              values={topic.questions}
              onChange={(questions) => setTopic(index, { questions })}
              placeholder="例：入学金と授業料は公式サイトでどう案内されているか"
              addLabel="問いを足す"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setPlan({ ...plan, topics: [...plan.topics, { key: `topic-${Date.now()}`, heading: '', questions: [''] }] })
          }
          className={addButton}
        >
          <Plus className="h-3.5 w-3.5" />
          見出しを足す
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-[#D14343]">{message}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={approve} disabled={pending} className={buttonPrimary}>
          <Search className="h-4 w-4" />
          {pending ? '処理中…' : 'この企画で調査を始める'}
        </button>
      </div>

      <div className="mt-6 border-t border-[#EEF3F6] pt-4">
        <p className="text-xs font-semibold text-[#406783]">または、コメントを付けて企画し直してもらう</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="例：インターは2校に絞って、学校の種類ではなく学校名で比べてください"
          className={`mt-2 ${inputClass}`}
        />
        <button type="button" onClick={replan} disabled={pending} className={`mt-2 ${buttonSecondary}`}>
          <RotateCcw className="h-4 w-4" />
          企画し直してもらう
        </button>
      </div>
    </section>
  );
}

// 1項目（文章＋出典）の編集
function ItemEditor({
  item,
  onChange,
  onRemove,
  sources,
  rows = 2,
  optional = false,
}: {
  item: GuideItem;
  onChange: (item: GuideItem) => void;
  onRemove?: () => void;
  sources: GuideSource[];
  rows?: number;
  // 比べるカードの項目のように、空欄でもよいもの
  optional?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[#F8FBFD] p-2">
      <div className="flex gap-2">
        <textarea
          value={item.text}
          onChange={(e) => onChange({ ...item, text: e.target.value })}
          rows={rows}
          placeholder={optional ? '空欄なら「—」と表示' : ''}
          className={inputClass}
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className={`${removeButton} self-start`} aria-label="項目を消す">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const on = item.sourceIds.includes(source.id);
          return (
            <button
              key={source.id}
              type="button"
              onClick={() =>
                onChange({
                  ...item,
                  sourceIds: on ? item.sourceIds.filter((id) => id !== source.id) : [...item.sourceIds, source.id],
                })
              }
              title={source.url}
              className={`max-w-[16rem] truncate rounded-full border px-2.5 py-1 text-[11px] ${
                on ? 'border-[#1478B8] bg-[#1478B8] text-white' : 'border-[#D8E7F0] bg-white text-[#557086]'
              }`}
            >
              {source.title}
            </button>
          );
        })}
      </div>
      {item.text.trim() && item.sourceIds.length === 0 && (
        <p className="mt-1 text-[11px] text-[#D14343]">
          {optional ? '出典が無いと、保存するときに空欄になります。' : '出典が無い項目は、保存するときに消えます。'}
        </p>
      )}
    </div>
  );
}

// 本文の確認・手直し
function DraftEditor({ guide, onSaved }: { guide: PlaceGuide; onSaved: (guide: PlaceGuide) => void }) {
  const [content, setContent] = useState<GuideContent>(
    guide.draft ?? { lead: '', highlights: [], comparison: null, topics: [], sources: [] }
  );
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [newLink, setNewLink] = useState<{ url: string; title: string; kind: SourceKind }>({
    url: '',
    title: '',
    kind: 'school',
  });

  // 付けられる出典 = 下書きの出典 + 調査で見つかった出典 + 会長が足したリンク
  const [extraSources, setExtraSources] = useState<GuideSource[]>([]);
  const availableSources: GuideSource[] = [
    ...content.sources,
    ...(guide.research?.sources ?? []),
    ...extraSources,
  ].filter((source, index, list) => list.findIndex((item) => item.id === source.id) === index);

  const update = (next: GuideContent) => {
    setContent(next);
    setMessage('');
  };

  const addLink = () => {
    const url = newLink.url.trim();
    if (!/^https?:\/\//.test(url)) {
      setMessage('リンクは https:// から始まるURLを入れてください。');
      return;
    }
    const id = Math.max(0, ...availableSources.map((source) => source.id)) + 1;
    setExtraSources([...extraSources, { id, url, title: newLink.title.trim() || url, kind: newLink.kind }]);
    setNewLink({ url: '', title: '', kind: 'school' });
  };

  // 保存するのは、使われている出典だけ
  const withUsedSources = (): GuideContent => {
    const used = new Set<number>([
      ...content.highlights.flatMap((item) => item.sourceIds),
      ...(content.comparison?.options.flatMap((option) => [
        ...option.summary.sourceIds,
        ...option.cells.flatMap((cell) => cell.sourceIds),
        ...(option.linkSourceId ? [option.linkSourceId] : []),
      ]) ?? []),
      ...content.topics.flatMap((topic) => topic.items.flatMap((item) => item.sourceIds)),
    ]);
    return {
      ...content,
      sources: availableSources
        .filter((source) => used.has(source.id))
        .map(({ id, url, title, kind }) => ({ id, url, title, kind })),
    };
  };

  const save = (thenPublish: boolean) => {
    startTransition(async () => {
      const saved = await savePlaceGuideDraft(guide.id, withUsedSources());
      if (!saved.ok) {
        setMessage(saved.error);
        return;
      }
      if (!thenPublish) {
        onSaved(saved.data);
        setMessage('保存しました。');
        return;
      }
      const published = await publishPlaceGuide(guide.id);
      if (!published.ok) {
        setMessage(published.error);
        return;
      }
      onSaved(published.data);
      setMessage('公開しました。ページに反映されています。');
    });
  };

  const comparison = content.comparison;
  const setOption = (index: number, patch: Partial<NonNullable<GuideContent['comparison']>['options'][number]>) =>
    comparison &&
    update({
      ...content,
      comparison: {
        ...comparison,
        options: comparison.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
      },
    });
  const setTopic = (index: number, patch: Partial<GuideContent['topics'][number]>) =>
    update({ ...content, topics: content.topics.map((topic, i) => (i === index ? { ...topic, ...patch } : topic)) });

  return (
    <section className="mt-8 rounded-2xl border border-[#1478B8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">本文の確認・手直し</h2>
        <button type="button" onClick={() => setPreview(!preview)} className={buttonSecondary}>
          <Eye className="h-4 w-4" />
          {preview ? '編集に戻る' : 'ページでの見え方'}
        </button>
      </div>

      {preview ? (
        <div className="mt-4 rounded-2xl bg-[#F8FBFD] p-4">
          <GuideSummary content={withUsedSources()} publishedAt={guide.publishedAt ?? new Date()} />
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <label className="block text-xs font-semibold text-[#406783]">
            冒頭の1文
            <textarea
              value={content.lead}
              onChange={(e) => update({ ...content, lead: e.target.value })}
              rows={2}
              className={`mt-1 ${inputClass}`}
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold">① まず知っておきたいこと</p>
            <div className="space-y-2">
              {content.highlights.map((item, index) => (
                <ItemEditor
                  key={index}
                  item={item}
                  sources={availableSources}
                  onChange={(next) =>
                    update({ ...content, highlights: content.highlights.map((it, i) => (i === index ? next : it)) })
                  }
                  onRemove={() => update({ ...content, highlights: content.highlights.filter((_, i) => i !== index) })}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => update({ ...content, highlights: [...content.highlights, { text: '', sourceIds: [] }] })}
              className={`mt-2 ${addButton}`}
            >
              <Plus className="h-3.5 w-3.5" />
              項目を足す
            </button>
          </div>

          {comparison && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">② 比べるカード</p>
                <button
                  type="button"
                  onClick={() => update({ ...content, comparison: null })}
                  className="text-xs text-[#D14343]"
                >
                  比べるカードごと消す
                </button>
              </div>
              <input
                value={comparison.title}
                onChange={(e) => update({ ...content, comparison: { ...comparison, title: e.target.value } })}
                className={`${inputClass} mb-3 font-semibold`}
                aria-label="比べるカードの見出し"
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {comparison.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="rounded-xl border border-[#E1EBF1] p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={option.name}
                        onChange={(e) => setOption(optionIndex, { name: e.target.value })}
                        className={`${inputClass} font-semibold`}
                        aria-label="選択肢の名前"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            ...content,
                            comparison: {
                              ...comparison,
                              options: comparison.options.filter((_, i) => i !== optionIndex),
                            },
                          })
                        }
                        className={removeButton}
                        aria-label="カードを消す"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mb-1 mt-3 text-[11px] font-semibold text-[#406783]">概要</p>
                    <ItemEditor
                      item={option.summary}
                      sources={availableSources}
                      optional
                      onChange={(summary) => setOption(optionIndex, { summary })}
                    />
                    {comparison.attributes.map((attribute, attributeIndex) => (
                      <div key={attribute}>
                        <p className="mb-1 mt-3 text-[11px] font-semibold text-[#406783]">{attribute}</p>
                        <ItemEditor
                          item={option.cells[attributeIndex] ?? { text: '', sourceIds: [] }}
                          sources={availableSources}
                          rows={1}
                          optional
                          onChange={(cell) =>
                            setOption(optionIndex, {
                              cells: comparison.attributes.map((_, i) =>
                                i === attributeIndex ? cell : option.cells[i] ?? { text: '', sourceIds: [] }
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                    <label className="mt-3 block text-[11px] font-semibold text-[#406783]">
                      「公式サイト」ボタンのリンク先
                      <select
                        value={option.linkSourceId ?? ''}
                        onChange={(e) =>
                          setOption(optionIndex, { linkSourceId: e.target.value ? Number(e.target.value) : null })
                        }
                        className={`mt-1 ${inputClass}`}
                      >
                        <option value="">出さない</option>
                        {availableSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">③ テーマ別の情報</p>
            <div className="space-y-3">
              {content.topics.map((topic, topicIndex) => (
                <div key={topicIndex} className="rounded-xl border border-[#E1EBF1] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={topic.heading}
                      onChange={(e) => setTopic(topicIndex, { heading: e.target.value })}
                      className={`${inputClass} font-semibold`}
                      aria-label="見出し"
                    />
                    <button
                      type="button"
                      onClick={() => update({ ...content, topics: content.topics.filter((_, i) => i !== topicIndex) })}
                      className={removeButton}
                      aria-label="見出しごと消す"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {topic.items.map((item, itemIndex) => (
                      <ItemEditor
                        key={itemIndex}
                        item={item}
                        sources={availableSources}
                        onChange={(next) =>
                          setTopic(topicIndex, { items: topic.items.map((it, j) => (j === itemIndex ? next : it)) })
                        }
                        onRemove={() => setTopic(topicIndex, { items: topic.items.filter((_, j) => j !== itemIndex) })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTopic(topicIndex, { items: [...topic.items, { text: '', sourceIds: [] }] })}
                    className={`mt-2 ${addButton}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    項目を足す
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => update({ ...content, topics: [...content.topics, { heading: '新しい見出し', items: [] }] })}
              className={`mt-2 ${addButton}`}
            >
              <Plus className="h-3.5 w-3.5" />
              見出しを足す
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-[#C9DDE9] p-3">
            <p className="text-xs font-semibold text-[#406783]">リンク（出典）を足す</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_2fr_1fr_auto]">
              <input
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
              <input
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                placeholder="ページの名前（例：〇〇インターナショナルスクール）"
                className={inputClass}
              />
              <select
                value={newLink.kind}
                onChange={(e) => setNewLink({ ...newLink, kind: e.target.value as SourceKind })}
                className={inputClass}
              >
                {SOURCE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SOURCE_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addLink} className={buttonSecondary}>
                足す
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#7F95A6]">足したリンクは、各項目の出典のボタンと「公式サイト」の選択肢に出てきます。</p>
          </div>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-[#406783]">{message}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => save(false)} disabled={pending} className={buttonSecondary}>
          保存
        </button>
        <button type="button" onClick={() => save(true)} disabled={pending} className={buttonPrimary}>
          {pending ? '処理中…' : guide.status === 'published' ? '保存して公開し直す' : '保存して公開する'}
        </button>
      </div>
    </section>
  );
}

function SendBack({
  guide,
  onRestarted,
}: {
  guide: PlaceGuide;
  onRestarted: (guide: PlaceGuide) => void;
}) {
  const [from, setFrom] = useState<'writing' | 'researching' | 'planning'>('writing');
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await restartPlaceGuide(guide.id, from, feedback);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setFeedback('');
      onRestarted(result.data);
    });
  };

  return (
    <section className="mt-6 rounded-2xl border border-[#E1EBF1] bg-white p-5">
      <h2 className="text-base font-bold">差し戻す</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ['writing', '執筆からやり直す'],
            ['researching', '調査からやり直す'],
            ['planning', '企画からやり直す'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFrom(value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs ${
              from === value ? 'border-[#1478B8] bg-[#1478B8] text-white' : 'border-[#D8E7F0] text-[#35617E]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={
          from === 'writing'
            ? 'ライターへのコメント（例：カードの項目を短く、同じ書き方にそろえて）'
            : from === 'planning'
              ? '編集長へのコメント（例：比べる項目に「費用の目安」を入れて）'
              : 'コメント（任意）'
        }
        className={`mt-3 ${inputClass}`}
      />
      {message && <p className="mt-2 text-sm text-[#D14343]">{message}</p>}
      <button type="button" onClick={submit} disabled={pending} className={`mt-3 ${buttonSecondary}`}>
        <RotateCcw className="h-4 w-4" />
        差し戻す
      </button>
    </section>
  );
}

export function GuideWorkspace({ initialGuide }: { initialGuide: PlaceGuide }) {
  const router = useRouter();
  const [guide, setGuide] = useState(initialGuide);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pending, startTransition] = useTransition();
  const loopRef = useRef(false);

  const automatic = AUTO_STEPS.includes(guide.status);

  // 会長の確認待ちになるまで、1段階ずつ進める
  // allowOverBudget: 予算を超えていても、次の1段階だけ進める（会長が「予算を超えて続ける」を押したとき）
  const runLoop = useCallback(
    async (allowOverBudget = false) => {
      if (loopRef.current) return;
      loopRef.current = true;
      setWorking(true);
      setActionError('');
      try {
        for (let first = true; ; first = false) {
          const result = await advancePlaceGuide(initialGuide.id, {
            allowOverBudget: allowOverBudget && first,
          });
          if (!result.ok) {
            setActionError(result.error);
            break;
          }
          setGuide(result.data);
          if (!AUTO_STEPS.includes(result.data.status) || result.data.error || result.data.running) break;
        }
      } catch (error) {
        // サーバーの時間制限などで通信が切れた。作業中の印は10分で外れるので、そのあとやり直せる
        console.error('advancePlaceGuide failed:', error);
        setActionError(
          '通信が途中で切れました。時間をおいてこの画面を開き直すと、状況が分かります（作業中の場合は最大10分待ってからやり直せます）。'
        );
      } finally {
        loopRef.current = false;
        setWorking(false);
      }
    },
    [initialGuide.id]
  );

  useEffect(() => {
    if (automatic && !guide.error && !guide.running) void runLoop();
  }, [automatic, guide.error, guide.running, runLoop]);

  // 別の画面で作業中のときは、ときどき様子を確かめる
  useEffect(() => {
    if (!guide.running || working) return;
    const timer = setTimeout(async () => {
      const result = await advancePlaceGuide(initialGuide.id);
      if (result.ok) setGuide(result.data);
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [guide, working, initialGuide.id]);

  const current = STEPS.find((step) => step.status === guide.status);

  return (
    <div>
      <Stepper guide={guide} working={working || guide.running} />

      {automatic && (working || guide.running) && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#406783]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {current?.who}が「{current?.label}」をしています。この画面を開いたままにしてください（数分かかることがあります）。
        </p>
      )}

      {guide.error === GUIDE_BUDGET_ERROR && (
        <div className="mt-4 rounded-xl border border-[#F5D9A8] bg-[#FFFBF2] px-4 py-3 text-sm text-[#8A5A12]">
          <p>
            予算に達したため、「{current?.label}」の前で止まっています（使った量：
            {usedTokens(guide.usage).toLocaleString('ja-JP')} / {TOKEN_BUDGET_PER_GUIDE.toLocaleString('ja-JP')}トークン）。
          </p>
          <p className="mt-1 text-xs">続けると、次の1段階だけ進みます。そのあとも、段階ごとにこのボタンで確認します。</p>
          <button type="button" onClick={() => void runLoop(true)} disabled={working} className={`mt-2 ${buttonSecondary}`}>
            予算を超えて続ける
          </button>
        </div>
      )}

      {((guide.error && guide.error !== GUIDE_BUDGET_ERROR) || actionError) && (
        <div className="mt-4 rounded-xl border border-[#F2B8B8] bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">
          <p>
            「{current?.label}」で止まりました：{guide.error || actionError}
          </p>
          {automatic && (
            <button type="button" onClick={() => void runLoop()} disabled={working} className={`mt-2 ${buttonSecondary}`}>
              <RotateCcw className="h-4 w-4" />
              この段階をやり直す
            </button>
          )}
        </div>
      )}

      <CostPanel guide={guide} />

      {guide.status === 'plan_review' && guide.plan && (
        <PlanEditor
          key={guide.updatedAt.toString()}
          guide={guide}
          onChange={setGuide}
          onRun={() => void runLoop()}
        />
      )}

      <WorkLog guide={guide} />

      {(guide.status === 'pending_review' || guide.status === 'published') && (
        <>
          <DraftEditor key={guide.updatedAt.toString()} guide={guide} onSaved={setGuide} />
          <SendBack guide={guide} onRestarted={setGuide} />
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-2 border-t border-[#EEF3F6] pt-5">
        {guide.status === 'published' && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await unpublishPlaceGuide(guide.id);
                if (result.ok) setGuide(result.data);
                else setActionError(result.error);
              })
            }
            className={buttonSecondary}
          >
            公開をやめる
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm('このまとめを削除しますか？ 公開中なら、ページからも消えます。')) return;
            startTransition(async () => {
              const result = await deletePlaceGuide(guide.id);
              if (result.ok) router.push('/ai/guides');
              else setActionError(result.error);
            });
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm text-[#D14343] hover:bg-[#FDECEC]"
        >
          <Trash2 className="h-4 w-4" />
          削除
        </button>
      </div>
    </div>
  );
}
