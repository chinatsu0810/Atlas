// Workflow「Threads投稿作成」：リサーチ → 企画 → 執筆 → 検品。
//
// 「誰が・どの順で動くか」だけを定義する。DBへの保存は SocialPostRecorder
// （lib/ai/social/recorder.ts が実装）、認証・人間の承認フロー（承認・却下・投稿済み化）は
// lib/ai/social/actions.ts が担う。検品後は必ず人間の確認待ち（pending_review）か
// 要修正（needs_revision）で停止し、Threadsへの投稿はこのWorkflowでは一切行わない。

import { socialResearcherEmployee } from '@/lib/ai/employees/social-researcher';
import { socialPlannerEmployee } from '@/lib/ai/employees/social-planner';
import { socialWriterEmployee } from '@/lib/ai/employees/social-writer';
import { socialEditorEmployee } from '@/lib/ai/employees/social-editor';

import { threadResearchSkill } from '@/lib/ai/skills/thread-research';
import { threadPlanningSkill } from '@/lib/ai/skills/thread-planning';
import { threadWritingSkill } from '@/lib/ai/skills/thread-writing';
import { threadQualityCheckSkill } from '@/lib/ai/skills/thread-quality-check';

import { countPostLength, MAX_POST_LENGTH } from '@/lib/ai/social/post-length';
import type {
  AuditResult,
  GenerateSocialDraftInput,
  PostPlan,
  ResearchResult,
  SocialDraftOutput,
} from '@/lib/ai/social/types';

import { defineStep, runStep } from './step';

const RESEARCH = defineStep(socialResearcherEmployee, threadResearchSkill);
const PLANNING = defineStep(socialPlannerEmployee, threadPlanningSkill);
const WRITING = defineStep(socialWriterEmployee, threadWritingSkill);
const QUALITY_CHECK = defineStep(socialEditorEmployee, threadQualityCheckSkill);

// 記録役（DBなどへの保存はWorkflowの外に委ねる）
export type SocialPostRecorder = {
  // リサーチ結果を保存し、企画中（planning）へ進める
  saveResearch(result: ResearchResult): Promise<void>;
  savePlan(plan: PostPlan): Promise<void>;
  // 執筆中（writing）へ進める
  startWriting(): Promise<void>;
  // 投稿案を保存し、検品中（auditing）へ進める
  saveDraft(draft: SocialDraftOutput): Promise<void>;
  // 検品結果を保存し、合格なら確認待ち（pending_review）、不合格なら要修正（needs_revision）へ進める
  saveAudit(audit: AuditResult): Promise<void>;
};

// Threadsの観測メモが渡されていない場合、リサーチ結果は必ず「AIの見立て（仮説）」にする
// （見ていない反応を「観測に基づく」と書かせない。モデルの出力にかかわらず強制する）
function enforceEvidenceLevel(
  research: ResearchResult,
  input: GenerateSocialDraftInput
): ResearchResult {
  const { resonance } = research;

  if (!resonance || input.observations?.trim()) return research;
  if (resonance.evidenceLevel === 'hypothesis') return research;

  return {
    ...research,
    resonance: {
      ...resonance,
      evidenceLevel: 'hypothesis',
      evidenceNote:
        'Threadsの実データ（観測メモ）は渡されていないため、AIの見立て（仮説）です。',
    },
  };
}

// 上限文字数を超えた投稿案は、ケンピンの判定にかかわらず必ず差し戻す
// （「500文字を超える場合は削ること」をモデル任せにせず、Workflow側でも強制する）
function enforcePostLengthLimit(
  result: AuditResult,
  draft: SocialDraftOutput
): AuditResult {
  const length = countPostLength(draft.draft, draft.hashtags);

  if (length <= MAX_POST_LENGTH) return result;

  return {
    approvedByAudit: false,
    auditStatus: 'needs_revision',
    auditComments: [
      `投稿案が${length}文字（ハッシュタグ込み）で、上限の${MAX_POST_LENGTH}文字を超えています。`,
      ...result.auditComments,
    ],
    warnings: result.warnings,
    suggestedChanges: [
      `${MAX_POST_LENGTH}文字以内に削ってください（現在${length}文字）。全部を伝えようとせず、` +
        '最初の1文と、経験・共感の部分を残して、興味を持たせることを優先してください。',
      ...result.suggestedChanges,
    ],
  };
}

// approvedByAudit と auditStatus の整合性を担保する（モデルの出力の矛盾を許さない）
function normalizeAudit(result: AuditResult): AuditResult {
  if (result.approvedByAudit && result.auditStatus !== 'pass') {
    return { ...result, auditStatus: 'needs_revision', approvedByAudit: false };
  }

  if (!result.approvedByAudit && result.auditStatus === 'pass') {
    return { ...result, auditStatus: 'needs_revision' };
  }

  return result;
}

/**
 * テーマ入力1件分の、リサーチ → 企画 → 執筆 → 検品の一連の流れ。
 * 手動1件作成と週次バッチのどちらからも呼ばれる。
 */
export async function runPostPipeline(
  input: GenerateSocialDraftInput,
  recorder: SocialPostRecorder
): Promise<void> {
  const research = enforceEvidenceLevel(await runStep(RESEARCH, input), input);
  await recorder.saveResearch(research);

  const plan = await runStep(PLANNING, { draftInput: input, research });
  await recorder.savePlan(plan);

  await runWriteAndCheck(input, research, plan, recorder);
}

/**
 * 執筆 → 検品。検品で差し戻された投稿案を、指摘を踏まえて書き直すときにも使う
 * （リサーチ・企画はやり直さない）。
 */
export async function runWriteAndCheck(
  input: GenerateSocialDraftInput,
  research: ResearchResult,
  plan: PostPlan,
  recorder: SocialPostRecorder,
  revisionFeedback?: AuditResult
): Promise<void> {
  await recorder.startWriting();

  const draft = await runStep(WRITING, {
    draftInput: input,
    research,
    postPlan: plan,
    revisionFeedback,
  });
  await recorder.saveDraft(draft);

  const audit = normalizeAudit(
    enforcePostLengthLimit(
      await runStep(QUALITY_CHECK, {
        draftInput: input,
        research,
        draftOutput: draft,
      }),
      draft
    )
  );
  await recorder.saveAudit(audit);
}
