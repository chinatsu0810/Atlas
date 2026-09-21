'use server';

import { desc, eq, gte } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  socialWorkflows,
  tags,
  type SocialWorkflowRow,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';

import { SkillCallError } from '@/lib/ai/core/skill';
import { UNEXPECTED_ERROR_MESSAGE, type ActionResult } from '@/lib/action-result';
import {
  runPostPipeline,
  runWriteAndCheck,
} from '@/lib/ai/workflows/social-post-pipeline';
import { runWeeklyBatch } from '@/lib/ai/workflows/social-weekly-batch';
import { buildAnalysisNote } from '@/lib/threads/analysis-note';
import { getLatestKpiReport } from '@/lib/threads/reports';

import {
  auditResultSchema,
  editedSocialDraftSchema,
  postPlanSchema,
  researchResultSchema,
  SOCIAL_BATCH_SIZE,
  SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH,
  SOCIAL_DRAFT_TONES,
  SOCIAL_WORKFLOW_STATUSES,
  type EditedSocialDraft,
  type GenerateSocialDraftInput,
  type SocialWorkflow,
} from './types';

import {
  SocialDraftGenerationError,
  SocialDraftValidationError,
  validateGenerateSocialDraftInput,
} from './service';

import { createSocialPostRecorder } from './recorder';

import {
  SocialWorkflowNotFoundError,
  SocialWorkflowStateError,
  SocialWorkflowUnauthorizedError,
} from './errors';

// このファイルの役割は、認証・入力検証・保存済みデータの読み書き・人間による承認フロー
// （承認・却下・投稿済み化）と、Workflow（lib/ai/workflows/social-*.ts）の呼び出しだけ。
// AI社員の呼び出し順序（リサーチ → 企画 → 執筆 → 検品）はWorkflow側で定義している。

async function requireAdmin() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    throw new SocialWorkflowUnauthorizedError(
      'この操作は運営のみ実行できます。'
    );
  }

  return user;
}

// Workflow中のAI呼び出しの失敗を、この機能のエラーに変換する（DBなどの他のエラーはそのまま）
async function withGenerationErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof SkillCallError) {
      throw new SocialDraftGenerationError(error.message);
    }

    throw error;
  }
}

function toSocialWorkflow(row: SocialWorkflowRow): SocialWorkflow {
  const tone = SOCIAL_DRAFT_TONES.includes(row.tone as never)
    ? (row.tone as SocialWorkflow['tone'])
    : SOCIAL_DRAFT_TONES[0];

  const status = SOCIAL_WORKFLOW_STATUSES.includes(row.status as never)
    ? (row.status as SocialWorkflow['status'])
    : 'researching';

  const research = researchResultSchema.nullable().safeParse(
    row.researchResult
  );

  const postPlan = postPlanSchema.nullable().safeParse(row.postPlan);

  const audit = auditResultSchema.nullable().safeParse(row.auditResult);

  const hashtags = Array.isArray(row.hashtags)
    ? row.hashtags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    id: row.id,
    platform: row.platform,
    topic: row.topic,
    audience: row.audience,
    tone,
    promoteAtlas: row.promoteAtlas,
    researchResult: research.success ? research.data : null,
    postPlan: postPlan.success ? postPlan.data : null,
    draft: row.draft,
    hashtags,
    auditResult: audit.success ? audit.data : null,
    status,
    createdBy: row.createdBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    postedAt: row.postedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getWorkflowRowOrThrow(
  workflowId: number
): Promise<SocialWorkflowRow> {
  const [row] = await db
    .select()
    .from(socialWorkflows)
    .where(eq(socialWorkflows.id, workflowId))
    .limit(1);

  if (!row) {
    throw new SocialWorkflowNotFoundError('投稿案が見つかりません。');
  }

  return row;
}

/**
 * 直近の投稿案（社内オフィスの通知やページ再訪時に表示するもの）を取得する。
 * 存在しない場合は null を返す。
 */
export async function getLatestSocialWorkflow(): Promise<SocialWorkflow | null> {
  await requireAdmin();

  const [row] = await db
    .select()
    .from(socialWorkflows)
    .orderBy(desc(socialWorkflows.updatedAt))
    .limit(1);

  return row ? toSocialWorkflow(row) : null;
}

/**
 * テーマ入力1件分の投稿作成Workflow（リサーチ→企画→執筆→検品）を、
 * 新しい投稿案として実行する。
 * createSocialWorkflow（手動1件作成）と createWeeklySocialBatch（週次バッチ）の
 * どちらからも呼ばれる共通処理。
 */
async function runPipelineForInput(
  input: GenerateSocialDraftInput,
  userId: number
): Promise<SocialWorkflowRow> {
  const [created] = await db
    .insert(socialWorkflows)
    .values({
      platform: 'threads',
      topic: input.topic,
      audience: input.audience,
      tone: input.tone,
      promoteAtlas: input.promoteAtlas,
      status: 'researching',
      createdBy: userId,
    })
    .returning();

  await withGenerationErrors(() =>
    runPostPipeline(input, createSocialPostRecorder(created.id))
  );

  return getWorkflowRowOrThrow(created.id);
}

/**
 * テーマ入力からリサーチ→企画→執筆→検品までを一気通貫で実行する（手動で1件だけ作る場合）。
 * 検品合格時は pending_review、不合格時は needs_revision で必ず停止する。
 * Threadsへの投稿は一切行わない。
 */
export async function createSocialWorkflow(
  rawInput: unknown
): Promise<SocialWorkflow> {
  const user = await requireAdmin();
  const input = validateGenerateSocialDraftInput(rawInput);

  const finalRow = await runPipelineForInput(input, user.id);

  return toSocialWorkflow(finalRow);
}

/**
 * 週次バッチ生成：リサーチ担当が「感情が動いているテーマ」を見つけ、テーマ・想定読者を提案し
 * （SOCIAL_BATCH_SIZE件、デフォルト10件＝1日1投稿+バッファ）、
 * それぞれについてリサーチ→企画→執筆→検品までを実行する。
 * 運営がThreadsの観測メモを渡した場合はそれに基づいて選び、渡さなければAIの見立て（仮説）になる。
 * 直近のテーマと重複しないよう、過去30日分のテーマを提案時の参考情報として渡す。
 * 検品合格・不合格に関わらず、すべて pending_review か needs_revision で停止し、
 * Threadsへの投稿は一切行わない。担当者がボタンを押したときのみ実行される。
 */
async function createWeeklySocialBatchOrThrow(
  rawObservations?: string,
  useLatestAnalysis?: boolean
): Promise<SocialWorkflow[]> {
  const user = await requireAdmin();

  // 運営が集めたThreadsの観測メモ（任意）。あれば、それに基づいてテーマを選ぶ
  const observations =
    typeof rawObservations === 'string' ? rawObservations.trim() : '';

  if (observations.length > SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH) {
    throw new SocialDraftValidationError(
      `観測メモは${SOCIAL_DRAFT_MAX_OBSERVATIONS_LENGTH}文字以内で入力してください`
    );
  }

  // 直近のKPI分析（運営のThreadsアカウントの数字と、分析担当の整理）を、テーマ選定と企画の
  // 「参考情報」として渡す。分析は保存されたものを使う（なければ何も渡さない）。
  let analysisNote: string | undefined;

  if (useLatestAnalysis === true) {
    const report = await getLatestKpiReport();

    if (report) {
      analysisNote = buildAnalysisNote(report);
    }
  }

  const tagRows = await db
    .select({ name: tags.name, category: tags.category })
    .from(tags);

  const typeTags = tagRows
    .filter((tag) => tag.category === 'type')
    .map((tag) => tag.name);

  const familyTags = tagRows
    .filter((tag) => tag.category === 'family')
    .map((tag) => tag.name);

  const themeTags = tagRows
    .filter((tag) => tag.category === 'theme')
    .map((tag) => tag.name);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentRows = await db
    .select({ topic: socialWorkflows.topic })
    .from(socialWorkflows)
    .where(gte(socialWorkflows.createdAt, thirtyDaysAgo))
    .orderBy(desc(socialWorkflows.createdAt))
    .limit(50);

  const recentTopics = recentRows.map((row) => row.topic);

  const rows = await withGenerationErrors(() =>
    runWeeklyBatch(
      {
        count: SOCIAL_BATCH_SIZE,
        recentTopics,
        themeTags,
        typeTags,
        familyTags,
        observations: observations || undefined,
        analysisNote,
      },
      (input) => runPipelineForInput(input, user.id)
    )
  );

  return rows.map(toSocialWorkflow);
}

/**
 * 直近の投稿案一覧を取得する（一覧・レビュー画面用）。
 */
export async function getRecentSocialWorkflows(
  limit = 30
): Promise<SocialWorkflow[]> {
  await requireAdmin();

  const rows = await db
    .select()
    .from(socialWorkflows)
    .orderBy(desc(socialWorkflows.createdAt))
    .limit(limit);

  return rows.map(toSocialWorkflow);
}

/**
 * needs_revision の投稿案について、検品コメントをライターに戻して
 * 執筆→検品を再実行する。担当者がボタンを押したときのみ実行される。
 */
async function reviseSocialWorkflowOrThrow(
  workflowId: number
): Promise<SocialWorkflow> {
  await requireAdmin();

  const row = await getWorkflowRowOrThrow(workflowId);

  if (row.status !== 'needs_revision') {
    throw new SocialWorkflowStateError(
      'この投稿案は現在再監査できる状態ではありません（needs_revisionのみ再監査できます）。'
    );
  }

  const research = researchResultSchema.safeParse(row.researchResult);

  if (!research.success) {
    throw new SocialWorkflowStateError(
      'リサーチ結果が見つからないため再監査できません。'
    );
  }

  const postPlan = postPlanSchema.safeParse(row.postPlan);

  if (!postPlan.success) {
    throw new SocialWorkflowStateError(
      '企画結果が見つからないため再監査できません。'
    );
  }

  const audit = auditResultSchema.safeParse(row.auditResult);

  const input: GenerateSocialDraftInput = {
    topic: row.topic,
    audience: row.audience,
    tone: row.tone as GenerateSocialDraftInput['tone'],
    promoteAtlas: row.promoteAtlas,
  };

  await withGenerationErrors(() =>
    runWriteAndCheck(
      input,
      research.data,
      postPlan.data,
      createSocialPostRecorder(workflowId),
      audit.success ? audit.data : undefined
    )
  );

  return toSocialWorkflow(await getWorkflowRowOrThrow(workflowId));
}

/**
 * 人間の担当者による承認。pending_review からのみ approved へ遷移できる。
 * 承認時点でのテキストエリアの内容（編集済みの可能性がある）を確定させる。
 */
async function approveSocialWorkflowOrThrow(
  workflowId: number,
  edited: EditedSocialDraft
): Promise<SocialWorkflow> {
  const user = await requireAdmin();

  const row = await getWorkflowRowOrThrow(workflowId);

  if (row.status !== 'pending_review') {
    throw new SocialWorkflowStateError(
      'この投稿案は承認待ち（pending_review）の状態ではないため承認できません。'
    );
  }

  const parsedEdit = editedSocialDraftSchema.safeParse(edited);

  if (!parsedEdit.success) {
    throw new SocialDraftValidationError(
      parsedEdit.error.issues[0]?.message ?? '入力内容を確認してください'
    );
  }

  const [updated] = await db
    .update(socialWorkflows)
    .set({
      draft: parsedEdit.data.draft,
      hashtags: parsedEdit.data.hashtags,
      status: 'approved',
      approvedBy: user.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(socialWorkflows.id, workflowId))
    .returning();

  return toSocialWorkflow(updated);
}

/**
 * 人間の担当者による却下。pending_review からのみ rejected へ遷移できる。
 */
async function rejectSocialWorkflowOrThrow(
  workflowId: number
): Promise<SocialWorkflow> {
  await requireAdmin();

  const row = await getWorkflowRowOrThrow(workflowId);

  if (row.status !== 'pending_review') {
    throw new SocialWorkflowStateError(
      'この投稿案は承認待ち（pending_review）の状態ではないため却下できません。'
    );
  }

  const [updated] = await db
    .update(socialWorkflows)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(socialWorkflows.id, workflowId))
    .returning();

  return toSocialWorkflow(updated);
}

/**
 * Threadsへ手動投稿した後、担当者が明示的に押したときのみ posted へ遷移する。
 * ここでもThreads APIの呼び出しは一切行わない（記録のみ）。
 */
async function markSocialWorkflowPostedOrThrow(
  workflowId: number
): Promise<SocialWorkflow> {
  await requireAdmin();

  const row = await getWorkflowRowOrThrow(workflowId);

  if (row.status !== 'approved') {
    throw new SocialWorkflowStateError(
      'この投稿案は承認済み（approved）の状態ではないため投稿済みにできません。'
    );
  }

  const [updated] = await db
    .update(socialWorkflows)
    .set({ status: 'posted', postedAt: new Date(), updatedAt: new Date() })
    .where(eq(socialWorkflows.id, workflowId))
    .returning();

  return toSocialWorkflow(updated);
}

/**
 * 投稿案を削除する（テストで作った不要なもの、AI呼び出し失敗で
 * researching/writing/auditing のまま止まってしまったものなどを片付けるため）。
 * 投稿済み（posted）は記録として残すため削除できない。
 */
async function deleteSocialWorkflowOrThrow(workflowId: number): Promise<void> {
  await requireAdmin();

  const row = await getWorkflowRowOrThrow(workflowId);

  if (row.status === 'posted') {
    throw new SocialWorkflowStateError(
      '投稿済みの記録は削除できません。'
    );
  }

  await db.delete(socialWorkflows).where(eq(socialWorkflows.id, workflowId));
}

// ============================================================
// 画面のボタンから呼ぶServer Action
//
// 本番では、Server Actionが投げた例外のメッセージが隠されてしまうため、
// 失敗の理由は例外ではなく、結果（ActionResult）として返す。
// 上の `〇〇OrThrow` が実際の処理で、ここはその呼び出しと、エラーの変換だけを行う。
// ============================================================

// 画面に出してよい（この機能が意図して投げる）エラーはそのまま、それ以外は詳細を隠してログに残す
function describeError(error: unknown): string {
  if (
    error instanceof SocialWorkflowUnauthorizedError ||
    error instanceof SocialWorkflowStateError ||
    error instanceof SocialWorkflowNotFoundError ||
    error instanceof SocialDraftValidationError ||
    error instanceof SocialDraftGenerationError
  ) {
    return error.message;
  }

  console.error('Unexpected error in social server action:', error);

  return UNEXPECTED_ERROR_MESSAGE;
}

async function runAction<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

export async function createWeeklySocialBatch(
  rawObservations?: string,
  useLatestAnalysis?: boolean
): Promise<ActionResult<SocialWorkflow[]>> {
  return runAction(() => createWeeklySocialBatchOrThrow(rawObservations, useLatestAnalysis));
}

export async function reviseSocialWorkflow(
  workflowId: number
): Promise<ActionResult<SocialWorkflow>> {
  return runAction(() => reviseSocialWorkflowOrThrow(workflowId));
}

export async function approveSocialWorkflow(
  workflowId: number,
  edited: EditedSocialDraft
): Promise<ActionResult<SocialWorkflow>> {
  return runAction(() => approveSocialWorkflowOrThrow(workflowId, edited));
}

export async function rejectSocialWorkflow(
  workflowId: number
): Promise<ActionResult<SocialWorkflow>> {
  return runAction(() => rejectSocialWorkflowOrThrow(workflowId));
}

export async function markSocialWorkflowPosted(
  workflowId: number
): Promise<ActionResult<SocialWorkflow>> {
  return runAction(() => markSocialWorkflowPostedOrThrow(workflowId));
}

export async function deleteSocialWorkflow(
  workflowId: number
): Promise<ActionResult<null>> {
  return runAction(async () => {
    await deleteSocialWorkflowOrThrow(workflowId);
    return null;
  });
}
