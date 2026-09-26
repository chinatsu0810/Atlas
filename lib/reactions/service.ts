import 'server-only';

import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  answerReactions,
  answers,
  experienceReactions,
  experiences,
  questionReactions,
  questions,
} from '@/lib/db/schema';
import {
  REACTION_TARGETS,
  isReactionTypeFor,
  type ReactionSummary,
  type ReactionTarget,
  type ReactionType,
} from '@/lib/reactions/types';

// 対象ごとのテーブルの違い（対象IDのカラム名）をここで吸収する
const TABLES = {
  experience: {
    table: experienceReactions,
    targetId: experienceReactions.experienceId,
    insert: (targetId: number, visitorId: string, reactionType: ReactionType) =>
      db
        .insert(experienceReactions)
        .values({ experienceId: targetId, visitorId, reactionType })
        .onConflictDoNothing()
        .returning({ id: experienceReactions.id }),
  },
  question: {
    table: questionReactions,
    targetId: questionReactions.questionId,
    insert: (targetId: number, visitorId: string, reactionType: ReactionType) =>
      db
        .insert(questionReactions)
        .values({ questionId: targetId, visitorId, reactionType })
        .onConflictDoNothing()
        .returning({ id: questionReactions.id }),
  },
  answer: {
    table: answerReactions,
    targetId: answerReactions.answerId,
    insert: (targetId: number, visitorId: string, reactionType: ReactionType) =>
      db
        .insert(answerReactions)
        .values({ answerId: targetId, visitorId, reactionType })
        .onConflictDoNothing()
        .returning({ id: answerReactions.id }),
  },
};

// 削除済み（論理削除）の対象にはリアクションさせない
export async function reactionTargetExists(
  target: ReactionTarget,
  targetId: number
) {
  let result: { id: number }[];

  switch (target) {
    case 'experience':
      result = await db
        .select({ id: experiences.id })
        .from(experiences)
        .where(
          and(eq(experiences.id, targetId), isNull(experiences.deletedAt))
        )
        .limit(1);
      break;

    case 'question':
      result = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.id, targetId), isNull(questions.deletedAt)))
        .limit(1);
      break;

    case 'answer':
      // 回答だけでなく、回答先の質問も残っていること
      result = await db
        .select({ id: answers.id })
        .from(answers)
        .innerJoin(questions, eq(answers.questionId, questions.id))
        .where(
          and(
            eq(answers.id, targetId),
            isNull(answers.deletedAt),
            isNull(questions.deletedAt)
          )
        )
        .limit(1);
      break;
  }

  return result.length > 0;
}

function emptySummary(target: ReactionTarget): ReactionSummary {
  return {
    counts: Object.fromEntries(
      REACTION_TARGETS[target].map((type) => [type, 0])
    ),
    reacted: [],
  };
}

// 複数の対象の件数と、この visitor が押したリアクションをまとめて返す
// （質問ページの回答一覧のように、1画面に複数ある場合に使う）
export async function getReactionSummaries(
  target: ReactionTarget,
  targetIds: number[],
  visitorId: string | null
): Promise<Map<number, ReactionSummary>> {
  const summaries = new Map(
    targetIds.map((id) => [id, emptySummary(target)])
  );

  if (targetIds.length === 0) {
    return summaries;
  }

  const { table, targetId: targetIdColumn } = TABLES[target];

  const rows = await db
    .select({
      targetId: targetIdColumn,
      reactionType: table.reactionType,
      total: count(),
    })
    .from(table)
    .where(inArray(targetIdColumn, targetIds))
    .groupBy(targetIdColumn, table.reactionType);

  for (const row of rows) {
    const summary = summaries.get(row.targetId);

    if (summary && isReactionTypeFor(target, row.reactionType)) {
      summary.counts[row.reactionType] = row.total;
    }
  }

  if (visitorId) {
    const mine = await db
      .select({
        targetId: targetIdColumn,
        reactionType: table.reactionType,
      })
      .from(table)
      .where(
        and(
          inArray(targetIdColumn, targetIds),
          eq(table.visitorId, visitorId)
        )
      );

    for (const row of mine) {
      const summary = summaries.get(row.targetId);

      if (summary && isReactionTypeFor(target, row.reactionType)) {
        summary.reacted.push(row.reactionType);
      }
    }
  }

  return summaries;
}

export async function getReactionSummary(
  target: ReactionTarget,
  targetId: number,
  visitorId: string | null
): Promise<ReactionSummary> {
  const summaries = await getReactionSummaries(target, [targetId], visitorId);
  return summaries.get(targetId) ?? emptySummary(target);
}

// 同じリアクションが既にあれば何もしない（ユニーク制約で重複を防ぐ）
export async function addReaction(
  target: ReactionTarget,
  targetId: number,
  visitorId: string,
  reactionType: ReactionType
) {
  const inserted = await TABLES[target].insert(
    targetId,
    visitorId,
    reactionType
  );

  return inserted.length > 0;
}

// 自分が押したリアクションの取消（押していなければ何もしない）
export async function removeReaction(
  target: ReactionTarget,
  targetId: number,
  visitorId: string,
  reactionType: ReactionType
) {
  const { table, targetId: targetIdColumn } = TABLES[target];

  const deleted = await db
    .delete(table)
    .where(
      and(
        eq(targetIdColumn, targetId),
        eq(table.visitorId, visitorId),
        eq(table.reactionType, reactionType)
      )
    )
    .returning({ id: table.id });

  return deleted.length > 0;
}
