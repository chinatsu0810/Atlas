// Workflow「国・地域別まとめ作成」：企画 → 調査（Web検索）→ 正誤チェック（Web取得）→ 執筆 → 審査 → 会長の確認待ち。
//
// Web検索を含むと全体で数分かかり、1回のリクエストの時間制限に当たるおそれがあるため、
// 1回の呼び出しで1段階だけ進める（runGuideStep）。どの段階まで進んだかは記録役がDBに残す。
// 公開は必ず会長の操作で行う（lib/ai/guides/actions.ts）。このWorkflowは公開しない。

import { guideChiefEmployee } from '@/lib/ai/employees/guide-chief';
import { guideResearcherEmployee } from '@/lib/ai/employees/guide-researcher';
import { guideFactCheckerEmployee } from '@/lib/ai/employees/guide-fact-checker';
import { guideWriterEmployee } from '@/lib/ai/employees/guide-writer';
import { guideReviewerEmployee } from '@/lib/ai/employees/guide-reviewer';

import { guidePlanningSkill } from '@/lib/ai/skills/guide-planning';
import { guideResearchSkill } from '@/lib/ai/skills/guide-research';
import { guideFactCheckSkill } from '@/lib/ai/skills/guide-fact-check';
import { guideWritingSkill } from '@/lib/ai/skills/guide-writing';
import { guideReviewSkill } from '@/lib/ai/skills/guide-review';

import type {
  FactCheckOutput,
  GuideContent,
  GuideItem,
  GuideFact,
  GuidePlan,
  GuideResearch,
  GuideSource,
  GuideStatus,
  GuideTarget,
  ResearchOutput,
  ReviewOutput,
  WritingOutput,
} from '@/lib/ai/guides/types';
import type { WebSource } from '@/lib/ai/core/web-skill';
import type { RunSkillOptions } from '@/lib/ai/core/skill';

import { defineStep, runStep, runWebStep } from './step';

const PLANNING = defineStep(guideChiefEmployee, guidePlanningSkill);
const RESEARCH = defineStep(guideResearcherEmployee, guideResearchSkill);
const FACT_CHECK = defineStep(guideFactCheckerEmployee, guideFactCheckSkill);
const WRITING = defineStep(guideWriterEmployee, guideWritingSkill);
const REVIEW = defineStep(guideReviewerEmployee, guideReviewSkill);

// 調査で使うWeb検索の回数の上限。検索するたびに、それまでの検索結果をすべて読み直すため、
// 回数に対して読む量（費用）はほぼ2乗で増える
const MAX_SEARCHES = 7;
// 正誤チェックで、引用部分で確かめられなかったときに開くページ数の上限と、1ページから読む量の上限
const MAX_FETCHES = 5;
const FETCH_CONTENT_TOKENS = 8_000;
// 思考の深さ。低いほど読み書きの量が減り、Web検索の回数も控えめになる
const EFFORT = 'medium' as const;
// 審査で差し戻されたときの、書き直しの回数の上限
const MAX_REVIEW_ROUNDS = 1;

export class GuideStepError extends Error {}

// 記録役（DBへの保存はWorkflowの外に委ねる）
export type GuideRecorder = {
  // 企画を保存し、会長の確認（plan_review）で止める
  savePlan(plan: GuidePlan): Promise<void>;
  saveResearch(research: GuideResearch): Promise<void>;
  saveFactCheck(factCheck: FactCheckOutput): Promise<void>;
  saveDraft(draft: GuideContent): Promise<void>;
  // 合格、または書き直しの上限に達したら会長の確認待ちへ。不合格なら執筆へ戻す
  saveReview(review: ReviewOutput, next: 'writing' | 'pending_review'): Promise<void>;
};

export type GuideState = {
  status: GuideStatus;
  target: GuideTarget;
  chairmanNote: string | null;
  chairmanFeedback: string | null;
  plan: GuidePlan | null;
  research: GuideResearch | null;
  factCheck: FactCheckOutput | null;
  draft: GuideContent | null;
  review: ReviewOutput | null;
  reviewRounds: number;
};

// URLの比較用（末尾のスラッシュ・#以降の違いを無視する）
function normalizeUrl(url: string) {
  return url.trim().replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
}

// 調査結果のうち、出典のURLが「Web検索・取得で実際に返ってきたページ」にあるものだけを残す
// （AIが知識から書いたURLや、存在しないURLを出典にさせない）
export function keepVerifiableFacts(output: ResearchOutput, webSources: WebSource[]): GuideResearch {
  const found = new Map(webSources.map((source) => [normalizeUrl(source.url), source]));
  const sources: GuideSource[] = [];
  const facts: GuideFact[] = [];
  let droppedCount = 0;

  for (const fact of output.facts) {
    const web = found.get(normalizeUrl(fact.sourceUrl));
    if (!web) {
      droppedCount++;
      continue;
    }

    let source = sources.find((item) => normalizeUrl(item.url) === normalizeUrl(web.url));
    if (!source) {
      source = {
        id: sources.length + 1,
        url: web.url,
        title: web.title,
        kind: fact.sourceKind,
        excerpts: web.excerpts,
      };
      sources.push(source);
    }

    facts.push({
      id: facts.length + 1,
      section: fact.section,
      option: fact.option,
      attribute: fact.attribute,
      claim: fact.claim,
      sourceId: source.id,
    });
  }

  return { facts, sources, droppedCount };
}

// 判定の漏れた情報は「確認できない」とみなす
function completeFactCheck(output: FactCheckOutput, research: GuideResearch): FactCheckOutput {
  return {
    results: research.facts.map(
      (fact) =>
        output.results.find((result) => result.factId === fact.id) ?? {
          factId: fact.id,
          verdict: 'unverifiable' as const,
          note: '正誤チェックの結果がありませんでした。',
        }
    ),
  };
}

export function confirmedFacts(research: GuideResearch, factCheck: FactCheckOutput): GuideFact[] {
  return research.facts.filter((fact) =>
    factCheck.results.some((result) => result.factId === fact.id && result.verdict === 'confirmed')
  );
}

// 読者向けの文章に、調べた過程の言い回しが混ざっていないか（AIへの指示とは別の歯止め）
const PROCESS_TALK = /今回|確認でき(た|る|ず|ませ|なかった)|記載(は|を|が)?(確認|見当たら|ありませ)|調査(では|の範囲|した範囲|時点)|見つかりませんでした|情報がありませ/;

export function hasProcessTalk(text: string) {
  return PROCESS_TALK.test(text);
}

// 見出しの「（今回確認できた範囲）」のような付け足しを外す
function cleanHeading(text: string) {
  return text.replace(/[（(][^）)]*[）)]/g, (part) => (hasProcessTalk(part) ? '' : part)).trim();
}

/**
 * 執筆結果を、ページに出せる形にする。
 * - 確認済みの情報に結びつかない項目（出典の無い項目）は落とす
 * - 調べた過程を書いた項目は落とす
 * - 比べるカードは、企画の項目の順・数にそろえる（分からない項目は空欄）
 */
export function toGuideContent(
  output: WritingOutput,
  facts: GuideFact[],
  research: GuideResearch,
  plan: GuidePlan
): GuideContent {
  const usedSourceIds = new Set<number>();

  const toItem = (item: { text: string; factIds: number[] }): GuideItem | null => {
    const text = item.text.trim();
    const sourceIds = [
      ...new Set(
        item.factIds
          .map((id) => facts.find((fact) => fact.id === id)?.sourceId)
          .filter((id): id is number => id !== undefined)
      ),
    ];
    if (!text || sourceIds.length === 0 || hasProcessTalk(text)) return null;
    sourceIds.forEach((id) => usedSourceIds.add(id));
    return { text, sourceIds };
  };
  const items = (list: { text: string; factIds: number[] }[]) =>
    list.map(toItem).filter((item): item is GuideItem => item !== null);

  const sourceKindOf = (id: number) => research.sources.find((source) => source.id === id)?.kind;

  let comparison: GuideContent['comparison'] = null;
  if (plan.comparison && output.comparison) {
    const { attributes } = plan.comparison;
    const options = plan.comparison.options
      .map((name) => {
        const written = output.comparison?.find((option) => option.option === name);
        if (!written) return null;

        const cells = attributes.map((attribute) => {
          const cell = written.cells.find((item) => item.attribute === attribute);
          return (cell && toItem(cell)) ?? { text: '', sourceIds: [] };
        });
        const summary = toItem(written.summary) ?? { text: '', sourceIds: [] };
        if (!summary.text && cells.every((cell) => !cell.text)) return null;

        // その選択肢の公式サイト：カードの根拠のうち、学校・施設・団体・公的機関の出典で、いちばん多く使ったもの
        const counts = new Map<number, number>();
        for (const id of [...summary.sourceIds, ...cells.flatMap((cell) => cell.sourceIds)]) {
          const kind = sourceKindOf(id);
          if (kind === 'school' || kind === 'organization' || kind === 'government') {
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
        }
        const linkSourceId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        return { name, summary, cells, linkSourceId };
      })
      .filter((option): option is NonNullable<typeof option> => option !== null);

    // 比べられるのは2つ以上そろったときだけ
    if (options.length >= 2) comparison = { title: plan.comparison.title, attributes, options };
  }

  const topics = output.topics
    .map((topic) => ({ heading: cleanHeading(topic.heading), items: items(topic.items) }))
    .filter((topic) => topic.heading && topic.items.length > 0);

  // 比べるカードから外れた選択肢の出典も数えてしまわないよう、最後に使われている出典だけを集め直す
  const used = new Set<number>([
    ...items(output.highlights).flatMap((item) => item.sourceIds),
    ...(comparison?.options.flatMap((option) => [
      ...option.summary.sourceIds,
      ...option.cells.flatMap((cell) => cell.sourceIds),
    ]) ?? []),
    ...topics.flatMap((topic) => topic.items.flatMap((item) => item.sourceIds)),
  ]);

  return {
    lead: hasProcessTalk(output.lead) ? '' : output.lead.trim(),
    highlights: items(output.highlights),
    comparison,
    topics,
    // ページに出すのは出典の名前とURLだけ（調査のときの引用部分は含めない）
    sources: research.sources
      .filter((source) => used.has(source.id))
      .map(({ id, url, title, kind }) => ({ id, url, title, kind })),
  };
}

/**
 * 正誤チェック。まず調査のときの引用部分と照らし合わせ（ページは開かない）、
 * それで確かめられなかった情報だけ、出典のページを開いて確かめる（開くのは最大 MAX_FETCHES ページ）。
 */
async function checkFacts(research: GuideResearch, options: RunSkillOptions): Promise<FactCheckOutput> {
  const byExcerpts = completeFactCheck(
    await runStep(FACT_CHECK, { research, mode: 'excerpts' }, options),
    research
  );

  const unverified = research.facts.filter((fact) =>
    byExcerpts.results.some((result) => result.factId === fact.id && result.verdict === 'unverifiable')
  );
  const sourceIds = [...new Set(unverified.map((fact) => fact.sourceId))].slice(0, MAX_FETCHES);
  if (sourceIds.length === 0) return byExcerpts;

  const subset: GuideResearch = {
    facts: unverified.filter((fact) => sourceIds.includes(fact.sourceId)),
    sources: research.sources.filter((source) => sourceIds.includes(source.id)),
    droppedCount: 0,
  };
  const { output } = await runWebStep(
    FACT_CHECK,
    { research: subset, mode: 'fetch' },
    { fetches: sourceIds.length, fetchContentTokens: FETCH_CONTENT_TOKENS },
    options
  );

  return {
    results: byExcerpts.results.map(
      (result) => output.results.find((item) => item.factId === result.factId) ?? result
    ),
  };
}

function requireValue<T>(value: T | null, message: string): T {
  if (value === null) throw new GuideStepError(message);
  return value;
}

/**
 * いまの段階（state.status）の作業を1つだけ実行し、結果を記録役に保存する。
 * 会長の確認待ち・公開中のときは何もしない。
 */
export async function runGuideStep(
  state: GuideState,
  recorder: GuideRecorder,
  // 使用量の記録（onUsage）などを、各ステップのAI呼び出しに渡す
  callerOptions: RunSkillOptions = {}
): Promise<void> {
  const options: RunSkillOptions = { effort: EFFORT, ...callerOptions };

  switch (state.status) {
    case 'planning': {
      const plan = await runStep(PLANNING, {
        target: state.target,
        chairmanNote: state.chairmanNote ?? undefined,
        // 会長が企画を差し戻したときは、前の企画とコメントを渡して作り直す
        previousPlan: state.chairmanFeedback ? state.plan ?? undefined : undefined,
        chairmanFeedback: state.chairmanFeedback ?? undefined,
      }, options);
      await recorder.savePlan(plan);
      return;
    }

    case 'researching': {
      const plan = requireValue(state.plan, '企画がありません。企画からやり直してください。');
      const { output, webSources } = await runWebStep(
        RESEARCH,
        { target: state.target, plan },
        { searches: MAX_SEARCHES },
        options
      );
      const research = keepVerifiableFacts(output, webSources);
      if (research.facts.length === 0) {
        throw new GuideStepError(
          '出典を確認できる情報が見つかりませんでした。企画を見直すか、もう一度調査してください。'
        );
      }
      await recorder.saveResearch(research);
      return;
    }

    case 'checking': {
      const research = requireValue(state.research, '調査結果がありません。調査からやり直してください。');
      await recorder.saveFactCheck(await checkFacts(research, options));
      return;
    }

    case 'writing': {
      const plan = requireValue(state.plan, '企画がありません。企画からやり直してください。');
      const research = requireValue(state.research, '調査結果がありません。調査からやり直してください。');
      const factCheck = requireValue(state.factCheck, '正誤チェックの結果がありません。');
      const facts = confirmedFacts(research, factCheck);
      if (facts.length === 0) {
        throw new GuideStepError(
          '正誤チェックで確認済みになった情報がありません。調査からやり直してください。'
        );
      }

      const output = await runStep(WRITING, {
        target: state.target,
        plan,
        facts,
        review: state.review ?? undefined,
        chairmanFeedback: state.chairmanFeedback ?? undefined,
      }, options);
      const draft = toGuideContent(output, facts, research, plan);
      if (draft.highlights.length === 0 && !draft.comparison && draft.topics.length === 0) {
        throw new GuideStepError('出典のある項目が1つも残りませんでした。執筆をやり直してください。');
      }
      await recorder.saveDraft(draft);
      return;
    }

    case 'reviewing': {
      const draft = requireValue(state.draft, '下書きがありません。執筆からやり直してください。');
      const review = await runStep(REVIEW, { target: state.target, content: draft }, options);
      // 審査の合否と指摘を食い違わせない
      const normalized: ReviewOutput = review.passed && review.issues.length > 0 ? { ...review, passed: false } : review;
      const next = !normalized.passed && state.reviewRounds < MAX_REVIEW_ROUNDS ? 'writing' : 'pending_review';
      await recorder.saveReview(normalized, next);
      return;
    }

    case 'plan_review':
    case 'pending_review':
    case 'published':
      return;
  }
}
