'use server';

import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  managementMeetings,
  meetingMessages,
  type ManagementMeetingRow,
  type MeetingMessageRow,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';

import { SkillCallError } from '@/lib/ai/core/skill';
import { UNEXPECTED_ERROR_MESSAGE, type ActionResult } from '@/lib/action-result';
import {
  resumeMeeting,
  restoreMeetingState,
  startMeeting,
} from '@/lib/ai/workflows/management-meeting';

import {
  answerMeetingInputSchema,
  createMeetingInputSchema,
  MEETING_STAGES,
  ownerDecisionInputSchema,
  type Meeting,
  type MeetingMessage,
  type MeetingStage,
  type MeetingWithMessages,
} from './types';

import { createMeetingRecorder } from './recorder';

import {
  MeetingGenerationError,
  MeetingNotFoundError,
  MeetingStateError,
  MeetingUnauthorizedError,
  MeetingValidationError,
} from './errors';

// このファイルの役割は、認証・入力検証・保存済みデータの読み書きと、Workflow
// （lib/ai/workflows/management-meeting.ts）の呼び出しだけ。会議の進行そのもの
// （誰が・どの順で・どこで止まるか）はWorkflow側で定義している。

async function requireAdmin() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    throw new MeetingUnauthorizedError('この操作は運営のみ実行できます。');
  }

  return user;
}

// Workflow中のAI呼び出しの失敗を、この機能のエラーに変換する（DBなどの他のエラーはそのまま）
async function withGenerationErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof SkillCallError) {
      throw new MeetingGenerationError(error.message);
    }

    throw error;
  }
}

function toMeeting(row: ManagementMeetingRow): Meeting {
  const stage = MEETING_STAGES.includes(row.stage as never)
    ? (row.stage as MeetingStage)
    : 'framing';

  return {
    id: row.id,
    topic: row.topic,
    stage,
    ownerDecision: row.ownerDecision,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
  };
}

function toMeetingMessage(row: MeetingMessageRow): MeetingMessage {
  const stage = MEETING_STAGES.includes(row.stage as never)
    ? (row.stage as MeetingStage)
    : 'framing';

  return {
    id: row.id,
    meetingId: row.meetingId,
    authorType: row.authorType as MeetingMessage['authorType'],
    employeeId: row.employeeId,
    stage,
    content: row.content,
    createdAt: row.createdAt,
  };
}

async function getMeetingRowOrThrow(
  meetingId: number
): Promise<ManagementMeetingRow> {
  const [row] = await db
    .select()
    .from(managementMeetings)
    .where(eq(managementMeetings.id, meetingId))
    .limit(1);

  if (!row) {
    throw new MeetingNotFoundError('会議が見つかりません。');
  }

  return row;
}

async function getMessages(meetingId: number): Promise<MeetingMessage[]> {
  const rows = await db
    .select()
    .from(meetingMessages)
    .where(eq(meetingMessages.meetingId, meetingId))
    .orderBy(meetingMessages.createdAt);

  return rows.map(toMeetingMessage);
}

async function getMeetingWithMessages(
  meetingId: number
): Promise<MeetingWithMessages> {
  const row = await getMeetingRowOrThrow(meetingId);

  return { ...toMeeting(row), messages: await getMessages(meetingId) };
}

/**
 * ①会長が案件投入。Workflowを開始し、会長への質問がなければそのまま最後まで進める。
 * 質問がある場合は awaiting_owner_input で必ず停止する。
 */
export async function createMeeting(rawInput: unknown): Promise<MeetingWithMessages> {
  const user = await requireAdmin();

  const parsed = createMeetingInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new MeetingValidationError(
      parsed.error.issues[0]?.message ?? '入力内容を確認してください'
    );
  }

  const { topic } = parsed.data;

  const [created] = await db
    .insert(managementMeetings)
    .values({ topic, stage: 'framing', createdBy: user.id })
    .returning();

  await withGenerationErrors(() =>
    startMeeting(topic, createMeetingRecorder(created.id))
  );

  return getMeetingWithMessages(created.id);
}

/**
 * ④会長への質問に対する回答を記録し、Workflowを再開する。
 */
async function answerMeetingQuestionsOrThrow(
  meetingId: number,
  rawInput: unknown
): Promise<MeetingWithMessages> {
  await requireAdmin();

  const meeting = toMeeting(await getMeetingRowOrThrow(meetingId));

  if (meeting.stage !== 'awaiting_owner_input') {
    throw new MeetingStateError(
      'この会議は現在、会長からの回答を待つ状態ではありません。'
    );
  }

  const parsed = answerMeetingInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new MeetingValidationError(
      parsed.error.issues[0]?.message ?? '入力内容を確認してください'
    );
  }

  await db.insert(meetingMessages).values({
    meetingId,
    authorType: 'owner',
    employeeId: null,
    stage: 'awaiting_owner_input',
    content: { answers: parsed.data.answers },
  });

  const state = restoreMeetingState(meeting.topic, await getMessages(meetingId));

  await withGenerationErrors(() =>
    resumeMeeting(state, createMeetingRecorder(meetingId))
  );

  return getMeetingWithMessages(meetingId);
}

/**
 * ⑨会長の最終判断を記録し、会議を終了する。
 * AIはここでも判断を代行しない。決定内容は会長の自由記述をそのまま記録する。
 */
async function closeMeetingWithOwnerDecisionOrThrow(
  meetingId: number,
  rawInput: unknown
): Promise<MeetingWithMessages> {
  await requireAdmin();

  const meeting = toMeeting(await getMeetingRowOrThrow(meetingId));

  if (meeting.stage !== 'awaiting_owner_decision') {
    throw new MeetingStateError(
      'この会議は現在、会長の判断を記録できる状態ではありません。'
    );
  }

  const parsed = ownerDecisionInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw new MeetingValidationError(
      parsed.error.issues[0]?.message ?? '入力内容を確認してください'
    );
  }

  await db.insert(meetingMessages).values({
    meetingId,
    authorType: 'owner',
    employeeId: null,
    stage: 'closed',
    content: { decision: parsed.data.decision },
  });

  await db
    .update(managementMeetings)
    .set({
      stage: 'closed',
      ownerDecision: parsed.data.decision,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(managementMeetings.id, meetingId));

  return getMeetingWithMessages(meetingId);
}

/**
 * 会議を削除する。議論の記録（meeting_messages）は外部キーの cascade で一緒に消える。
 * 進行中・判断待ち・判断済みのどの状態でも削除できる（処理が途中で止まった会議を片付けるため）。
 */
async function deleteMeetingOrThrow(meetingId: number): Promise<{ id: number }> {
  await requireAdmin();

  if (!Number.isInteger(meetingId)) {
    throw new MeetingValidationError('会議の指定が正しくありません。');
  }

  await getMeetingRowOrThrow(meetingId);

  await db.delete(managementMeetings).where(eq(managementMeetings.id, meetingId));

  return { id: meetingId };
}

export async function getMeeting(meetingId: number): Promise<MeetingWithMessages> {
  await requireAdmin();
  return getMeetingWithMessages(meetingId);
}

export async function getRecentMeetings(limit = 30): Promise<Meeting[]> {
  await requireAdmin();

  const rows = await db
    .select()
    .from(managementMeetings)
    .orderBy(desc(managementMeetings.createdAt))
    .limit(limit);

  return rows.map(toMeeting);
}

/**
 * 直近の会議（社内オフィスの通知やページ再訪時に表示するもの）を取得する。
 * 存在しない場合は null を返す。
 */
export async function getLatestMeeting(): Promise<Meeting | null> {
  await requireAdmin();

  const [row] = await db
    .select()
    .from(managementMeetings)
    .orderBy(desc(managementMeetings.updatedAt))
    .limit(1);

  return row ? toMeeting(row) : null;
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
    error instanceof MeetingUnauthorizedError ||
    error instanceof MeetingStateError ||
    error instanceof MeetingNotFoundError ||
    error instanceof MeetingValidationError ||
    error instanceof MeetingGenerationError
  ) {
    return error.message;
  }

  console.error('Unexpected error in meeting server action:', error);

  return UNEXPECTED_ERROR_MESSAGE;
}

async function runAction<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

export async function answerMeetingQuestions(
  meetingId: number,
  rawInput: unknown
): Promise<ActionResult<MeetingWithMessages>> {
  return runAction(() => answerMeetingQuestionsOrThrow(meetingId, rawInput));
}

export async function closeMeetingWithOwnerDecision(
  meetingId: number,
  rawInput: unknown
): Promise<ActionResult<MeetingWithMessages>> {
  return runAction(() => closeMeetingWithOwnerDecisionOrThrow(meetingId, rawInput));
}

export async function deleteMeeting(
  meetingId: number
): Promise<ActionResult<{ id: number }>> {
  return runAction(() => deleteMeetingOrThrow(meetingId));
}
