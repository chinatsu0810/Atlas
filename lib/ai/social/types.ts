import { z } from 'zod';

export const SOCIAL_DRAFT_TONES = [
  '共感重視',
  '役立ち重視',
  '親しみ重視',
  '問いかけ重視',
] as const;

export type SocialDraftTone = (typeof SOCIAL_DRAFT_TONES)[number];

export const SOCIAL_DRAFT_MAX_TOPIC_LENGTH = 200;
export const SOCIAL_DRAFT_MAX_AUDIENCE_LENGTH = 200;
export const SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH = 5000;

export const generateSocialDraftInputSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, 'テーマを入力してください')
    .max(
      SOCIAL_DRAFT_MAX_TOPIC_LENGTH,
      `テーマは${SOCIAL_DRAFT_MAX_TOPIC_LENGTH}文字以内で入力してください`
    ),

  audience: z
    .string()
    .trim()
    .min(1, '想定読者を入力してください')
    .max(
      SOCIAL_DRAFT_MAX_AUDIENCE_LENGTH,
      `想定読者は${SOCIAL_DRAFT_MAX_AUDIENCE_LENGTH}文字以内で入力してください`
    ),

  tone: z.enum(SOCIAL_DRAFT_TONES, {
    message: 'トーンを選択してください',
  }),

  promoteAtlas: z.boolean(),

  // 運営が集めたThreadsの観測メモ（直近の伸びた投稿・コメント・反応の様子など。任意）。
  // これがある場合のみ、リサーチ担当は「観測に基づく」と書ける。なければAIの見立て（仮説）になる。
  // DBには保存しない（リサーチ結果に反映されるだけ）。
  observations: z
    .string()
    .trim()
    .max(
      SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH,
      `観測メモは${SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH}文字以内で入力してください`
    )
    .optional(),

  // 週次バッチのテーマ選定時に見立てた、感情・反応された理由のメモ（任意。DBには保存しない）
  themeNote: z.string().trim().max(1000).optional(),

  // 運営のThreadsアカウントの直近の分析（KPIレビュー）の要約。企画（切り口・構成）とテーマ選定の
  // 「参考」にだけ使う。仮説を含み、事実として扱わない。書き手（ライター）には渡さない（DBには保存しない）。
  analysisNote: z.string().trim().max(4000).optional(),
});

export type GenerateSocialDraftInput = z.infer<
  typeof generateSocialDraftInputSchema
>;

export const socialDraftOutputSchema = z.object({
  draft: z.string(),
  hashtags: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type SocialDraftOutput = z.infer<typeof socialDraftOutputSchema>;

// ============================================================
// Threads運用チーム（リサーチ / 企画 / ライター / 検品 / 分析）
// ============================================================

// 「感情が動いているテーマ」の見立て。リサーチ担当の提出形式
// （テーマ／なぜ反応されたか／どんな感情があるか／Atlas視点の切り口／経験投稿につながる問い）に対応する。
//
// evidenceLevel:
//   observed   … 運営が渡したThreadsの観測メモに基づく
//   hypothesis … Threadsの実データがない、AIの見立て（仮説）。「反応が多い」等の事実として扱わない
export const EVIDENCE_LEVELS = ['observed', 'hypothesis'] as const;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  observed: 'Threadsの観測に基づく',
  hypothesis: 'AIの見立て（Threadsの実データなし）',
};

export const resonanceSchema = z.object({
  whyItResonated: z.string(), // なぜ反応されたか（されそうか）
  emotions: z.array(z.string()), // どんな感情があるか
  atlasAngle: z.string(), // Atlas視点の切り口
  experienceQuestions: z.array(z.string()), // 経験投稿につながる問い
  evidenceLevel: z.enum(EVIDENCE_LEVELS),
  evidenceNote: z.string(), // 根拠（観測メモのどこか）、または実データがない旨
});

export type Resonance = z.infer<typeof resonanceSchema>;

// リサーチ担当の出力。
// resonance は後から追加した項目のため、それ以前に保存された投稿案では存在しない（optional）。
export const researchResultSchema = z.object({
  readerConcerns: z.array(z.string()), // 読者が今悩んでいること
  keywords: z.array(z.string()), // 読者が反応している言葉・言い回し
  talkingPoints: z.array(z.string()), // 経験を語れる論点
  factsToVerify: z.array(z.string()), // 事実確認が必要な内容
  unverifiedClaimsToAvoid: z.array(z.string()), // 使用してはいけない未確認情報
  atlasConnectionIdeas: z.array(z.string()), // Atlasを紹介できる自然な接点
  sources: z.array(z.string()), // 使用した情報源。確認できない場合は空配列
  resonance: resonanceSchema.optional(),
});

export type ResearchResult = z.infer<typeof researchResultSchema>;

// 企画担当の出力（投稿の切り口・構成・方針。本文執筆はライターの仕事）
export const postPlanSchema = z.object({
  angle: z.string(), // 採用する切り口
  angleOptions: z.array(z.string()), // 検討した切り口の選択肢（採用しなかったものも含む）
  structure: z.array(z.string()), // 投稿の構成（段落ごとの流れ）
  policy: z.string(), // 投稿方針（トーン・重点の運用メモ）
  rationale: z.string(), // なぜこの切り口・構成を選んだか
});

export type PostPlan = z.infer<typeof postPlanSchema>;

// 検品担当の出力（要件で指定された形式そのまま。旧: 監査役の出力）
export const auditResultSchema = z.object({
  approvedByAudit: z.boolean(),
  auditStatus: z.enum(['pass', 'needs_revision']),
  auditComments: z.array(z.string()),
  warnings: z.array(z.string()),
  suggestedChanges: z.array(z.string()),
});

export type AuditResult = z.infer<typeof auditResultSchema>;

// ワークフロー全体の状態
export const SOCIAL_WORKFLOW_STATUSES = [
  'researching',
  'planning',
  'writing',
  'auditing',
  'needs_revision',
  'pending_review',
  'approved',
  'rejected',
  'posted',
] as const;

export type SocialWorkflowStatus = (typeof SOCIAL_WORKFLOW_STATUSES)[number];

// DBの生の行(jsonbはunknown)を、アプリ側で安全な型に検証・変換した結果
export type SocialWorkflow = {
  id: number;
  platform: string;
  topic: string;
  audience: string;
  tone: SocialDraftTone;
  promoteAtlas: boolean;
  researchResult: ResearchResult | null;
  postPlan: PostPlan | null;
  draft: string;
  hashtags: string[];
  auditResult: AuditResult | null;
  status: SocialWorkflowStatus;
  createdBy: number;
  approvedBy: number | null;
  approvedAt: Date | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// 人間による編集内容（承認時に投稿本文・ハッシュタグを確定させる）
export const MAX_EDITED_DRAFT_LENGTH = 2000;
export const MAX_HASHTAG_LENGTH = 50;
export const MAX_HASHTAG_COUNT = 10;

export const editedSocialDraftSchema = z.object({
  draft: z
    .string()
    .trim()
    .min(1, '投稿本文を入力してください')
    .max(
      MAX_EDITED_DRAFT_LENGTH,
      `投稿本文は${MAX_EDITED_DRAFT_LENGTH}文字以内で入力してください`
    ),

  hashtags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(MAX_HASHTAG_LENGTH, `ハッシュタグは${MAX_HASHTAG_LENGTH}文字以内にしてください`)
    )
    .max(MAX_HASHTAG_COUNT, `ハッシュタグは${MAX_HASHTAG_COUNT}個以内にしてください`),
});

export type EditedSocialDraft = z.infer<typeof editedSocialDraftSchema>;

// ============================================================
// 週次バッチ生成（テーマ企画）
// ============================================================

// 週1回、1日1投稿+バッファ分を想定した件数
export const SOCIAL_BATCH_SIZE = 10;

// リサーチャーが「感情が動いているテーマ」を見立てて提案する、投稿テーマ候補
export const topicCandidateSchema = z.object({
  topic: z.string(),
  audience: z.string(),
  tone: z.enum(SOCIAL_DRAFT_TONES),
  promoteAtlas: z.boolean(),
  emotion: z.string(), // このテーマの中心にある感情
  whyItResonated: z.string(), // なぜ反応されたか（されそうか）
});

export type TopicCandidate = z.infer<typeof topicCandidateSchema>;

export const topicCandidateListSchema = z.object({
  candidates: z.array(topicCandidateSchema),
});
