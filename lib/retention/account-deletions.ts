import { and, asc, eq, inArray, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  accountDeletions,
  answers,
  contactStatusHistory,
  contacts,
  experienceTags,
  experiences,
  questionTags,
  questions,
} from '@/lib/db/schema';
import type { Tx } from '@/lib/account/delete-user';

// 退会（deleteUser）から PURGE_DAYS 日後に、データを物理削除する。
// 仕様は docs/account-deletion.md の「30日後のパージ」を参照。
//
// - 完全削除（mode 'full'）: 質問・回答・経験談と、そのタグ。
//   本人の質問に付いた他人の回答も削除する（answers.question_id のFKを満たすため）。
// - どちらのモードでも: お問い合わせ（本文・対応履歴）。
// users の行（墓標）、activity_logs、teams、account_deletions の記録は残す。

export type PurgeCounts = {
  questionTags: number;
  answers: number;
  questions: number;
  experienceTags: number;
  experiences: number;
  contactStatusHistory: number;
  contacts: number;
};

function emptyCounts(): PurgeCounts {
  return {
    questionTags: 0,
    answers: 0,
    questions: 0,
    experienceTags: 0,
    experiences: 0,
    contactStatusHistory: 0,
    contacts: 0,
  };
}

/** パージ期限を過ぎていて、まだ実行していない削除記録 */
export function dueDeletionCondition(now: Date) {
  return and(
    isNull(accountDeletions.purgedAt),
    lte(accountDeletions.purgeAfter, now)
  );
}

/**
 * 1件の削除記録のパージを、呼び出し側のトランザクションの中で実行する。
 * 期限前・実行済みなら何もせず null を返す（何度呼んでも安全）。
 * 子テーブルを先に消す。
 */
export async function purgeAccountDeletionInTransaction(
  tx: Tx,
  deletionId: number,
  now: Date = new Date()
): Promise<PurgeCounts | null> {
  const [deletion] = await tx
    .select()
    .from(accountDeletions)
    .where(
      and(eq(accountDeletions.id, deletionId), dueDeletionCondition(now))
    )
    .for('update')
    .limit(1);

  if (!deletion) {
    return null;
  }

  const { userId } = deletion;
  const counts = emptyCounts();

  if (deletion.mode === 'full') {
    const userQuestionIds = tx
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.authorId, userId));

    const userExperienceIds = tx
      .select({ id: experiences.id })
      .from(experiences)
      .where(eq(experiences.authorId, userId));

    counts.questionTags = (
      await tx
        .delete(questionTags)
        .where(inArray(questionTags.questionId, userQuestionIds))
        .returning({ id: questionTags.id })
    ).length;

    counts.answers = (
      await tx
        .delete(answers)
        .where(
          or(
            inArray(answers.questionId, userQuestionIds),
            eq(answers.authorId, userId)
          )
        )
        .returning({ id: answers.id })
    ).length;

    counts.questions = (
      await tx
        .delete(questions)
        .where(eq(questions.authorId, userId))
        .returning({ id: questions.id })
    ).length;

    counts.experienceTags = (
      await tx
        .delete(experienceTags)
        .where(inArray(experienceTags.experienceId, userExperienceIds))
        .returning({ id: experienceTags.id })
    ).length;

    counts.experiences = (
      await tx
        .delete(experiences)
        .where(eq(experiences.authorId, userId))
        .returning({ id: experiences.id })
    ).length;
  }

  const userContactIds = tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.userId, userId));

  counts.contactStatusHistory = (
    await tx
      .delete(contactStatusHistory)
      .where(inArray(contactStatusHistory.contactId, userContactIds))
      .returning({ id: contactStatusHistory.id })
  ).length;

  counts.contacts = (
    await tx
      .delete(contacts)
      .where(eq(contacts.userId, userId))
      .returning({ id: contacts.id })
  ).length;

  await tx
    .update(accountDeletions)
    .set({ purgedAt: now })
    .where(eq(accountDeletions.id, deletion.id));

  return counts;
}

export type PurgeDueAccountDeletionsResult = {
  dryRun: boolean;
  // パージ期限を過ぎている削除記録の件数
  due: number;
  purged: number;
  // 失敗した件数。失敗した記録は purged_at が入らないので、次回のジョブで再実行される
  failed: number;
  deleted: PurgeCounts;
};

/**
 * 期限を過ぎた削除記録をすべてパージする。1件ごとに別のトランザクションで実行し、
 * 1件が失敗しても、他の記録には影響しない。
 */
export async function purgeDueAccountDeletions({
  dryRun = false,
  now = new Date(),
}: {
  dryRun?: boolean;
  now?: Date;
} = {}): Promise<PurgeDueAccountDeletionsResult> {
  const due = await db
    .select({ id: accountDeletions.id })
    .from(accountDeletions)
    .where(dueDeletionCondition(now))
    .orderBy(asc(accountDeletions.id));

  const result: PurgeDueAccountDeletionsResult = {
    dryRun,
    due: due.length,
    purged: 0,
    failed: 0,
    deleted: emptyCounts(),
  };

  if (dryRun) {
    return result;
  }

  for (const { id } of due) {
    try {
      const counts = await db.transaction((tx) =>
        purgeAccountDeletionInTransaction(tx, id, now)
      );

      if (!counts) {
        continue;
      }

      result.purged += 1;
      for (const key of Object.keys(counts) as (keyof PurgeCounts)[]) {
        result.deleted[key] += counts[key];
      }
    } catch (error) {
      result.failed += 1;
      console.error(`Failed to purge account deletion ${id}:`, error);
    }
  }

  return result;
}
