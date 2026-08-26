'use server';

import { redirect } from 'next/navigation';

import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  or,
} from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { answers, questions } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/permissions';


/**
 * 質問を作成
 */
export async function createQuestion(formData: FormData) {
  const session = await getSession();

  if (!session) {
    throw new Error('ログインしてください');
  }

  const title = formData.get('title') as string;
  const country = formData.get('country') as string;

const countryFreeText =
  (formData.get('countryFreeText') as string)?.trim() || null;
  const content = formData.get('content') as string;

  if (!title?.trim() || !country?.trim() || !content?.trim()) {
    throw new Error('すべての項目を入力してください');
  }

  const normalizedTitle = title.trim();
const normalizedCountry =
  country.trim() === 'その他'
    ? countryFreeText || 'その他'
    : country.trim();
const normalizedContent = content.trim();

  // 二重送信対策
  const recentDuplicate = await db
    .select({
      id: questions.id,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .where(
      and(
        eq(questions.authorId, session.user.id),
        eq(questions.title, normalizedTitle),
        eq(questions.country, normalizedCountry),
        eq(questions.content, normalizedContent),
        isNull(questions.deletedAt)
      )
    )
    .orderBy(desc(questions.createdAt))
    .limit(1);

  if (recentDuplicate.length > 0) {
    const existingQuestion = recentDuplicate[0];

    const elapsed =
      Date.now() - existingQuestion.createdAt.getTime();

    if (elapsed <= 10_000) {
      redirect(`/questions/${existingQuestion.id}`);
    }
  }

  const [question] = await db
    .insert(questions)
    .values({
      title: normalizedTitle,
      country: normalizedCountry,
      content: normalizedContent,
      authorId: session.user.id,
    })
    .returning({
      id: questions.id,
    });

  redirect(`/questions/${question.id}`);
}


/**
 * 回答を作成
 */
export async function createAnswer(formData: FormData) {
  const session = await getSession();

  if (!session) {
    throw new Error('ログインしてください');
  }

  const questionId = Number(formData.get('questionId'));
  const content = formData.get('content') as string;

  if (!Number.isInteger(questionId)) {
    throw new Error('質問が見つかりません');
  }

  if (!content?.trim()) {
    throw new Error('回答を入力してください');
  }

  const normalizedContent = content.trim();

  // 二重送信対策
  const recentDuplicate = await db
    .select({
      id: answers.id,
      createdAt: answers.createdAt,
    })
    .from(answers)
    .where(
      and(
        eq(answers.questionId, questionId),
        eq(answers.authorId, session.user.id),
        eq(answers.content, normalizedContent),
        isNull(answers.deletedAt)
      )
    )
    .orderBy(desc(answers.createdAt))
    .limit(1);

  if (recentDuplicate.length > 0) {
    const existingAnswer = recentDuplicate[0];

    const elapsed =
      Date.now() - existingAnswer.createdAt.getTime();

    if (elapsed <= 10_000) {
      redirect(`/questions/${questionId}`);
    }
  }

  await db.insert(answers).values({
    questionId,
    content: normalizedContent,
    authorId: session.user.id,
  });

  redirect(`/questions/${questionId}`);
}


/**
 * 管理者による質問の論理削除
 */
export async function deleteQuestion(formData: FormData) {
  const session = await getSession();

  if (!session) {
    throw new Error('ログインしてください');
  }

  const admin = await isAdmin(session.user.id);

  if (!admin) {
    throw new Error('この操作を実行する権限がありません');
  }

  const questionId = Number(formData.get('questionId'));

  if (!Number.isInteger(questionId)) {
    throw new Error('質問が見つかりません');
  }

  // 質問を論理削除
  await db
    .update(questions)
    .set({
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(questions.id, questionId),
        isNull(questions.deletedAt)
      )
    );

  redirect('/search');
}


/**
 * 管理者による回答の論理削除
 */
export async function deleteAnswer(formData: FormData) {
  const session = await getSession();

  if (!session) {
    throw new Error('ログインしてください');
  }

  const admin = await isAdmin(session.user.id);

  if (!admin) {
    throw new Error('この操作を実行する権限がありません');
  }

  const answerId = Number(formData.get('answerId'));
  const questionId = Number(formData.get('questionId'));

  if (!Number.isInteger(answerId)) {
    throw new Error('回答が見つかりません');
  }

  if (!Number.isInteger(questionId)) {
    throw new Error('質問が見つかりません');
  }

  // 回答を論理削除
  await db
    .update(answers)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(answers.id, answerId),
        eq(answers.questionId, questionId),
        isNull(answers.deletedAt)
      )
    );

  redirect(`/questions/${questionId}`);
}


/**
 * 質問検索
 *
 * スペース区切りで複数キーワードを指定した場合はAND検索。
 * 各キーワードがタイトル・本文・国のいずれかに
 * 含まれている質問を対象とする。
 */
export async function searchQuestions(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  const keywords = trimmedKeyword
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (keywords.length === 0) {
    return [];
  }

  const conditions = keywords.map((originalKeyword) => {
    const variants =
      originalKeyword === '小学校'
        ? ['小学校', '小学生']
        : originalKeyword === '小学生'
          ? ['小学生', '小学校']
          : [originalKeyword];

    return or(
      ...variants.flatMap((word) => [
        ilike(questions.title, `%${word}%`),
        ilike(questions.content, `%${word}%`),
        ilike(questions.country, `%${word}%`),
      ])
    );
  });

  return await db
    .select()
    .from(questions)
    .where(
      and(
        ...conditions,
        isNull(questions.deletedAt)
      )
    )
    .orderBy(desc(questions.createdAt));
}