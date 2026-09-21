// Workflow「経営判断会議」：社長が進行し、経営判断室が議論し、監査室がレビューし、
// 最後は必ず会長の判断に委ねる。
//
// このファイルは「誰が・どの順で・どこで止まるか」だけを定義する。DBへの保存は
// MeetingRecorder（lib/ai/management/recorder.ts が実装）、認証・入力検証は
// lib/ai/management/actions.ts が担う。AIは決定せず、会長の入力を待つ場所は
// awaiting_owner_input（質問への回答）と awaiting_owner_decision（最終判断）の2か所だけ。

import { presidentEmployee } from '@/lib/ai/employees/president';
import { whyAnalystEmployee } from '@/lib/ai/employees/why-analyst';
import { decisionMakerEmployee } from '@/lib/ai/employees/decision-maker';
import { contrarianEmployee } from '@/lib/ai/employees/contrarian';
import { userAdvocateEmployee } from '@/lib/ai/employees/user-advocate';
import { exitPlannerEmployee } from '@/lib/ai/employees/exit-planner';
import { experimentDriverEmployee } from '@/lib/ai/employees/experiment-driver';
import { managementAuditorEmployee } from '@/lib/ai/employees/management-auditor';
import { getEmployeeById } from '@/lib/ai/employees';

import { meetingFramingSkill } from '@/lib/ai/skills/meeting-framing';
import { whyAnalysisSkill } from '@/lib/ai/skills/why-analysis';
import { decisionFrameworkSkill } from '@/lib/ai/skills/decision-framework';
import { riskCheckSkill } from '@/lib/ai/skills/risk-check';
import { userPerspectiveSkill } from '@/lib/ai/skills/user-perspective';
import { exitCriteriaSkill } from '@/lib/ai/skills/exit-criteria';
import { experimentDesignSkill } from '@/lib/ai/skills/experiment-design';
import { proposalDraftingSkill } from '@/lib/ai/skills/proposal-drafting';
import { proposalReviewSkill } from '@/lib/ai/skills/proposal-review';
import { meetingSummarySkill } from '@/lib/ai/skills/meeting-summary';

import { AUDITOR_RULES, MEETING_COMMON_RULES } from '@/lib/ai/management/common-rules';
import { MeetingStateError } from '@/lib/ai/management/errors';
import {
  meetingFramingSchema,
  OWNER_DECISION_PROMPT_TEXT,
  type DiscussionContext,
  type MeetingFraming,
  type MeetingMessage,
  type MeetingMessageAuthorType,
  type MeetingStage,
  type OwnerAnswer,
  type PriorStatement,
} from '@/lib/ai/management/types';

import type { SkillEffort } from '@/lib/ai/core/skill';

import { defineStep, runStep, type WorkflowStep } from './step';

// 会議の各ステップの思考の深さ。1回の会議でAIを約10回直列に呼ぶため、既定（high）のままだと
// 思考に時間がかかり、会議全体が5〜8分になる。速度と品質のバランスはここ1か所で調整する
// （品質を優先するなら 'high'、さらに速くするなら 'low'）。
export const MEETING_EFFORT: SkillEffort = 'medium';

// 会議の全ステップを、この関数経由で実行する。全員に共通ルール（短く・結論から）を差し込む。
// 監査室だけは共通ルールの対象外で、代わりに「重大な指摘だけ」の別ルールを適用する。
function runMeetingStep<TInput, TOutput>(
  step: WorkflowStep<TInput, TOutput>,
  input: TInput
): Promise<TOutput> {
  const sharedRules =
    step.employee.id === managementAuditorEmployee.id ? AUDITOR_RULES : MEETING_COMMON_RULES;

  return runStep(step, input, { effort: MEETING_EFFORT, sharedRules });
}

// 会長への質問往復の上限（初回議論＋この回数まで再議論する）。
// 上限に達した場合は、残った質問を一次案の未確認事項として引き継ぎ、先へ進める。
export const MAX_DISCUSSION_ROUNDS = 2;

// 監査室が差し戻せる回数の上限。上限に達した場合は、監査室の指摘を
// 会長への総括に残したうえで先へ進める（無限ループにしない）。
export const MAX_PROPOSAL_REWORKS = 1;

// ============================================================
// ステップの宣言（誰が・どのスキルで）
// ============================================================

const FRAMING = defineStep(presidentEmployee, meetingFramingSkill);
const PROPOSAL_DRAFTING = defineStep(decisionMakerEmployee, proposalDraftingSkill);
const PROPOSAL_REVIEW = defineStep(managementAuditorEmployee, proposalReviewSkill);
const SUMMARY = defineStep(presidentEmployee, meetingSummarySkill);

// 経営判断室の発言順。並びがそのまま発言順になる。
// 発言者を増やす・減らす・入れ替えるときはこの配列だけを変更する
// （各Skillの出力は、会長への質問 questionsForOwner を持つこと）。
//
// 実験推進担当は、指摘（反対意見・利用者視点の懸念・撤退条件）がすべて出たあとに
// 発言できるよう、必ず最後に置く。指摘で議論が止まらないよう、指摘を「小さく試せる実験」に
// 変換して次の一手まで進めるのがこの位置の役割（一次案はこの発言を含む全発言を材料にする）。
const DISCUSSION_STEPS: WorkflowStep<DiscussionContext, { questionsForOwner: string[] }>[] = [
  defineStep(whyAnalystEmployee, whyAnalysisSkill),
  defineStep(decisionMakerEmployee, decisionFrameworkSkill),
  defineStep(contrarianEmployee, riskCheckSkill),
  defineStep(userAdvocateEmployee, userPerspectiveSkill),
  defineStep(exitPlannerEmployee, exitCriteriaSkill),
  defineStep(experimentDriverEmployee, experimentDesignSkill),
];

// ============================================================
// 記録役（DBなどへの保存はWorkflowの外に委ねる）
// ============================================================

export type MeetingRecorder = {
  setStage(stage: MeetingStage): Promise<void>;
  say(message: {
    authorType: MeetingMessageAuthorType;
    employeeId: string | null;
    stage: MeetingStage;
    content: unknown;
  }): Promise<void>;
};

// 会長の操作を待って停止した場所
export type MeetingProgress = 'awaiting_owner_input' | 'awaiting_owner_decision';

// 会議の進行状態（会長の回答後に再開するために、記録から復元できるもの）
export type MeetingState = {
  topic: string;
  framing: MeetingFraming;
  statements: PriorStatement[];
  ownerAnswers: OwnerAnswer[];
  roundNumber: number;
};

// ============================================================
// 進行
// ============================================================

/**
 * ②社長が案件整理 → ③経営判断室が発言 → 質問がなければそのまま⑥〜⑨まで進める。
 * 会長への質問がある場合は awaiting_owner_input で停止する。
 */
export async function startMeeting(
  topic: string,
  recorder: MeetingRecorder
): Promise<MeetingProgress> {
  const framing = await runMeetingStep(FRAMING, { topic });

  await recorder.say({
    authorType: 'employee',
    employeeId: FRAMING.employee.id,
    stage: 'framing',
    content: framing,
  });

  await recorder.setStage('discussing');

  return continueMeeting(
    { topic, framing, statements: [], ownerAnswers: [], roundNumber: 1 },
    recorder
  );
}

/**
 * ⑤会長の回答を踏まえた追加議論。まだ質問が残っていて往復回数の上限に達していなければ
 * 再度 awaiting_owner_input で停止し、解消した（または上限に達した）場合は⑥〜⑨まで進める。
 */
export async function resumeMeeting(
  state: MeetingState,
  recorder: MeetingRecorder
): Promise<MeetingProgress> {
  await recorder.setStage('discussing');
  return continueMeeting(state, recorder);
}

async function continueMeeting(
  state: MeetingState,
  recorder: MeetingRecorder
): Promise<MeetingProgress> {
  const round = await runDiscussionRound(state, recorder);

  if (round.questionsForOwner.length > 0 && state.roundNumber < MAX_DISCUSSION_ROUNDS) {
    await recorder.say({
      authorType: 'system',
      employeeId: null,
      stage: 'awaiting_owner_input',
      content: { questions: round.questionsForOwner },
    });
    await recorder.setStage('awaiting_owner_input');

    return 'awaiting_owner_input';
  }

  await runProposalToOwnerDecision(state, round.statements, recorder);

  return 'awaiting_owner_decision';
}

// 経営判断室のメンバーを順番に実行する。Employee同士は直接会話しないため、
// Workflowが直前までの発言をまとめて各ステップに渡す。
async function runDiscussionRound(
  state: MeetingState,
  recorder: MeetingRecorder
): Promise<{ statements: PriorStatement[]; questionsForOwner: string[] }> {
  const statements = [...state.statements];
  const questionsForOwner: string[] = [];

  for (const step of DISCUSSION_STEPS) {
    const output = await runMeetingStep(step, {
      topic: state.topic,
      framing: state.framing,
      priorStatements: statements,
      ownerAnswers: state.ownerAnswers,
    });

    await recorder.say({
      authorType: 'employee',
      employeeId: step.employee.id,
      stage: 'discussing',
      content: output,
    });

    statements.push({
      employeeId: step.employee.id,
      employeeName: step.employee.name,
      employeeRole: step.employee.role,
      content: output,
    });

    questionsForOwner.push(...output.questionsForOwner);
  }

  return { statements, questionsForOwner };
}

// ⑥一次案作成 → ⑦監査室レビュー（差し戻しはAI内部で自動的にやり直す）→ ⑧社長総括 →
// ⑨会長へ返却。最後の問いかけはモデル任せにせず、固定文言で必ず締めくくる。
async function runProposalToOwnerDecision(
  state: MeetingState,
  discussionStatements: PriorStatement[],
  recorder: MeetingRecorder
): Promise<void> {
  const { topic, framing, ownerAnswers } = state;

  await recorder.setStage('drafting_proposal');

  let proposal = await runMeetingStep(PROPOSAL_DRAFTING, {
    topic,
    framing,
    discussionStatements,
    ownerAnswers,
  });
  await recorder.say({
    authorType: 'employee',
    employeeId: PROPOSAL_DRAFTING.employee.id,
    stage: 'drafting_proposal',
    content: proposal,
  });

  await recorder.setStage('auditing_proposal');

  let review = await runMeetingStep(PROPOSAL_REVIEW, { topic, framing, proposal });
  await recorder.say({
    authorType: 'employee',
    employeeId: PROPOSAL_REVIEW.employee.id,
    stage: 'auditing_proposal',
    content: review,
  });

  let reworkCount = 0;

  while (review.verdict === 'needs_rework' && reworkCount < MAX_PROPOSAL_REWORKS) {
    reworkCount += 1;

    await recorder.setStage('needs_rework');
    await recorder.say({
      authorType: 'system',
      employeeId: null,
      stage: 'needs_rework',
      content: { note: '監査室の指摘を踏まえ、一次案を作り直します。' },
    });

    proposal = await runMeetingStep(PROPOSAL_DRAFTING, {
      topic,
      framing,
      discussionStatements,
      ownerAnswers,
      reworkFeedback: review,
    });
    await recorder.say({
      authorType: 'employee',
      employeeId: PROPOSAL_DRAFTING.employee.id,
      stage: 'drafting_proposal',
      content: proposal,
    });

    await recorder.setStage('auditing_proposal');

    review = await runMeetingStep(PROPOSAL_REVIEW, { topic, framing, proposal });
    await recorder.say({
      authorType: 'employee',
      employeeId: PROPOSAL_REVIEW.employee.id,
      stage: 'auditing_proposal',
      content: review,
    });
  }

  await recorder.setStage('summarizing');

  const summary = await runMeetingStep(SUMMARY, {
    topic,
    framing,
    proposal,
    proposalReview: review,
  });
  await recorder.say({
    authorType: 'employee',
    employeeId: SUMMARY.employee.id,
    stage: 'summarizing',
    content: summary,
  });

  await recorder.say({
    authorType: 'system',
    employeeId: null,
    stage: 'awaiting_owner_decision',
    content: { text: OWNER_DECISION_PROMPT_TEXT },
  });
  await recorder.setStage('awaiting_owner_decision');
}

// ============================================================
// 記録からの復元（会長の回答後に議論を再開するため）
// ============================================================

/**
 * 保存済みの発言から、会議の進行状態を復元する。
 * messages には、会長の回答（awaiting_owner_input の owner メッセージ）を含めておくこと。
 */
export function restoreMeetingState(
  topic: string,
  messages: MeetingMessage[]
): MeetingState {
  const framingMessage = messages.find(
    (message) => message.stage === 'framing' && message.authorType === 'employee'
  );

  const framing = meetingFramingSchema.safeParse(framingMessage?.content);

  if (!framing.success) {
    throw new MeetingStateError('案件整理の記録が見つからないため処理を続行できません。');
  }

  const statements: PriorStatement[] = messages
    .filter((message) => message.stage === 'discussing' && message.authorType === 'employee')
    .map((message) => {
      const employee = message.employeeId ? getEmployeeById(message.employeeId) : null;

      return {
        employeeId: message.employeeId ?? 'unknown',
        employeeName: employee?.name ?? message.employeeId ?? '不明',
        employeeRole: employee?.role ?? '',
        content: message.content,
      };
    });

  const ownerAnswerMessages = messages.filter(
    (message) => message.authorType === 'owner' && message.stage === 'awaiting_owner_input'
  );

  const ownerAnswers = ownerAnswerMessages.flatMap((message) => {
    const content = message.content as { answers?: OwnerAnswer[] } | null;
    return content?.answers ?? [];
  });

  return {
    topic,
    framing: framing.data,
    statements,
    ownerAnswers,
    // 初回の議論＋会長が回答した回数
    roundNumber: 1 + ownerAnswerMessages.length,
  };
}
