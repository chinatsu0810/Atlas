import { z } from 'zod';

// ============================================================
// 会議の状態
// ============================================================

export const MEETING_STAGES = [
  'framing', // ②社長が案件整理
  'discussing', // ③経営判断室が発言 / ⑤追加議論
  'awaiting_owner_input', // ④会長に質問（人間の入力待ちで停止）
  'drafting_proposal', // ⑥経営判断室の一次案作成
  'auditing_proposal', // ⑦監査室レビュー
  'needs_rework', // ⑦で差し戻し（AI内部で自動的に⑥へ戻る。人間の操作は不要）
  'summarizing', // ⑧社長が総括
  'awaiting_owner_decision', // ⑨会長へ返却（人間の判断待ちで停止）
  'closed', // 会長が判断を記録し、会議終了
] as const;

export type MeetingStage = (typeof MEETING_STAGES)[number];

// 人間の操作を待って停止する状態
export const MEETING_WAITING_STAGES: MeetingStage[] = [
  'awaiting_owner_input',
  'awaiting_owner_decision',
];

export const MAX_TOPIC_LENGTH = 500;

export const createMeetingInputSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, '案件を入力してください')
    .max(MAX_TOPIC_LENGTH, `案件は${MAX_TOPIC_LENGTH}文字以内で入力してください`),
});

export type CreateMeetingInput = z.infer<typeof createMeetingInputSchema>;

// ============================================================
// ②社長が案件整理（framing）
// ============================================================

export const meetingFramingSchema = z.object({
  currentSituation: z.string(), // 現状
  issues: z.array(z.string()), // 課題
  hypotheses: z.array(z.string()), // 仮説
  decisionPoints: z.array(z.string()), // 判断したいこと
});

export type MeetingFraming = z.infer<typeof meetingFramingSchema>;

// ============================================================
// ③経営判断室が発言 / ⑤追加議論
// 経営判断室の全員に共通の入力コンテキスト。Employee同士が直接会話せず、
// Workflow（lib/ai/management/workflow.ts）が直前までの発言をまとめて渡す。
// ============================================================

export type PriorStatement = {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  content: unknown;
};

export type OwnerAnswer = {
  question: string;
  answer: string;
};

export type DiscussionContext = {
  topic: string;
  framing: MeetingFraming;
  priorStatements: PriorStatement[];
  ownerAnswers: OwnerAnswer[];
};

// ナゼの出力
export const whyAnalysisSchema = z.object({
  chain: z.array(
    z.object({ question: z.string(), answer: z.string() })
  ), // 「なぜ」の掘り下げ（最大5段階程度）
  facts: z.array(z.string()),
  assumptions: z.array(z.string()),
  questionsForOwner: z.array(z.string()),
});

export type WhyAnalysis = z.infer<typeof whyAnalysisSchema>;

// ヒカクの出力（討議時）
export const decisionOptionsSchema = z.object({
  options: z.array(z.string()),
  prosAndCons: z.array(
    z.object({
      option: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })
  ),
  judgmentMaterials: z.array(z.string()),
  questionsForOwner: z.array(z.string()),
});

export type DecisionOptions = z.infer<typeof decisionOptionsSchema>;

// ギモンの出力
export const riskCheckSchema = z.object({
  challengedAssumptions: z.array(z.string()),
  risks: z.array(z.string()),
  alternatives: z.array(z.string()),
  questionsForOwner: z.array(z.string()),
});

export type RiskCheck = z.infer<typeof riskCheckSchema>;

// リヨウシャの出力
export const userPerspectiveSchema = z.object({
  userValue: z.array(z.string()),
  userConcerns: z.array(z.string()),
  questionsForOwner: z.array(z.string()),
});

export type UserPerspective = z.infer<typeof userPerspectiveSchema>;

// テッタイの出力
export const exitCriteriaSchema = z.object({
  successCriteria: z.array(z.string()),
  exitCriteria: z.array(z.string()),
  evaluationPeriod: z.string(),
  questionsForOwner: z.array(z.string()),
});

export type ExitCriteria = z.infer<typeof exitCriteriaSchema>;

// スイシンの出力。議論で出た懸念を、小さく試せる実験に変換して
// 「案 / 懸念 / 致命度 / 最小実験 / 期間 / 見る数字・反応 / 次の判断」の形で持ち込む。
export const EXPERIMENT_SEVERITY_STOP = '今すぐ止めるべき';
export const EXPERIMENT_SEVERITY_VERIFIABLE = '検証可能';

export const experimentPlanSchema = z.object({
  proposal: z.string(), // 案：何をやるのか
  concerns: z.array(
    z.object({
      concern: z.string(), // 他の社員から出た主な指摘
      raisedBy: z.string(), // 誰の指摘か
      severity: z.enum([EXPERIMENT_SEVERITY_STOP, EXPERIMENT_SEVERITY_VERIFIABLE]), // 致命度
      reason: z.string(), // その致命度と判断した理由
    })
  ),
  minimalExperiment: z.string(), // 最小実験
  duration: z.string(), // 期間
  metrics: z.array(z.string()), // 見る数字・反応
  nextDecision: z.object({
    continueIf: z.string(), // 続ける条件
    reviseIf: z.string(), // 修正する条件
    stopIf: z.string(), // やめる条件
  }),
  questionsForOwner: z.array(z.string()),
});

export type ExperimentPlan = z.infer<typeof experimentPlanSchema>;

// ============================================================
// ⑥経営判断室の一次案作成（ヒカクが全体を統合してまとめる）
// ============================================================

export const proposalOptionSchema = z.object({
  option: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  risks: z.array(z.string()),
});

export const meetingProposalSchema = z.object({
  options: z.array(proposalOptionSchema),
  judgmentMaterials: z.array(z.string()),
  openQuestions: z.array(z.string()), // 未確認事項
});

export type MeetingProposal = z.infer<typeof meetingProposalSchema>;

// ============================================================
// ⑦監査室レビュー
// ============================================================

export const proposalReviewSchema = z.object({
  verdict: z.enum(['pass', 'needs_rework']),
  comments: z.array(z.string()),
  kpiValidityNotes: z.array(z.string()), // KPI妥当性・前提確認・手段の目的化防止の観点のコメント
  reworkRequests: z.array(z.string()), // needs_reworkの場合の差し戻し内容
});

export type ProposalReview = z.infer<typeof proposalReviewSchema>;

// ============================================================
// ⑧社長が総括
// ============================================================

export const meetingSummarySchema = z.object({
  facts: z.array(z.string()),
  assumptions: z.array(z.string()),
  keyPoints: z.array(z.string()), // 論点
  options: z.array(z.string()), // 選択肢（一次案を簡潔に要約したもの）
  risks: z.array(z.string()),
  openQuestions: z.array(z.string()), // 未解決事項
});

export type MeetingSummary = z.infer<typeof meetingSummarySchema>;

// 会長への最終確認は、モデル任せにせず固定文言で必ず締めくくる
export const OWNER_DECISION_PROMPT_TEXT = '会長、どう判断しますか？';

// ============================================================
// 会議・発言メッセージ（DBの生の行を、アプリ側で安全な型に変換した結果）
// ============================================================

export type MeetingMessageAuthorType = 'employee' | 'owner' | 'system';

export type MeetingMessage = {
  id: number;
  meetingId: number;
  authorType: MeetingMessageAuthorType;
  employeeId: string | null;
  stage: MeetingStage;
  content: unknown;
  createdAt: Date;
};

export type Meeting = {
  id: number;
  topic: string;
  stage: MeetingStage;
  ownerDecision: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

export type MeetingWithMessages = Meeting & {
  messages: MeetingMessage[];
};

// ④会長への質問の入力
export const answerMeetingInputSchema = z.object({
  answers: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().trim().min(1, '回答を入力してください'),
      })
    )
    .min(1, '回答する質問がありません'),
});

export type AnswerMeetingInput = z.infer<typeof answerMeetingInputSchema>;

// ⑨会長の最終判断
export const MAX_OWNER_DECISION_LENGTH = 2000;

export const ownerDecisionInputSchema = z.object({
  decision: z
    .string()
    .trim()
    .min(1, '判断内容を入力してください')
    .max(
      MAX_OWNER_DECISION_LENGTH,
      `判断内容は${MAX_OWNER_DECISION_LENGTH}文字以内で入力してください`
    ),
});

export type OwnerDecisionInput = z.infer<typeof ownerDecisionInputSchema>;
