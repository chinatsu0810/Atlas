'use server';

import { redirect } from 'next/navigation';

import {
  and,
  desc,
  eq,
  ilike,
  isNull,
  or,
  notInArray,
} from 'drizzle-orm';

import { countries } from '@/lib/constants/countries';
import { db } from '@/lib/db/drizzle';
import {
  answers,
  questionTags,
  questions,
} from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/permissions';

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

  const tagIds = formData
    .getAll('tagIds')
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!title?.trim() || !country?.trim() || !content?.trim()) {
    throw new Error('すべての必須項目を入力してください');
  }

  const normalizedTitle = title.trim();

  const normalizedCountry =
    country.trim() === 'その他'
      ? countryFreeText || 'その他'
      : country.trim();

  const normalizedContent = content.trim();

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

    if (elapsed <= 10000) {
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

  if (tagIds.length > 0) {
    await db.insert(questionTags).values(
      tagIds.map((tagId) => ({
        questionId: question.id,
        tagId,
      }))
    );
  }

  redirect(`/questions/${question.id}`);
}

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

    if (elapsed <= 10000) {
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

export async function searchQuestions(keyword: string) {
  const trimmedKeyword = keyword.trim();

  // 最新の質問表示用
  if (!trimmedKeyword) {
    return await db
      .select()
      .from(questions)
      .where(isNull(questions.deletedAt))
      .orderBy(desc(questions.createdAt))
      .limit(20);
  }

  // 「その他」クリック時
  if (trimmedKeyword === 'その他') {
    const majorCountries = countries.filter(
      (country) => country !== 'その他'
    );

    return await db
      .select()
      .from(questions)
      .where(
        and(
          notInArray(
            questions.country,
            majorCountries
          ),
          isNull(questions.deletedAt)
        )
      )
      .orderBy(desc(questions.createdAt));
  }

  const keywords = trimmedKeyword
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const conditions = keywords.map((word) =>
    or(
      ilike(questions.title, `%${word}%`),
      ilike(questions.content, `%${word}%`),
      ilike(questions.country, `%${word}%`)
    )
  );

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

