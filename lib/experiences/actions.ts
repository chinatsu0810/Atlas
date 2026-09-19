'use server';

import { redirect } from 'next/navigation';
import { and, desc, eq, ilike, isNull, notInArray, or } from 'drizzle-orm';

import { countries } from '@/lib/constants/countries';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { experienceTags, experiences } from '@/lib/db/schema';

export async function createExperience(formData: FormData) {
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
      id: experiences.id,
      createdAt: experiences.createdAt,
    })
    .from(experiences)
    .where(
      and(
        eq(experiences.authorId, session.user.id),
        eq(experiences.title, normalizedTitle),
        eq(experiences.country, normalizedCountry),
        eq(experiences.content, normalizedContent),
        isNull(experiences.deletedAt)
      )
    )
    .orderBy(desc(experiences.createdAt))
    .limit(1);

  if (recentDuplicate.length > 0) {
    const existingExperience = recentDuplicate[0];

    const elapsed =
      Date.now() - existingExperience.createdAt.getTime();

    if (elapsed <= 10000) {
      redirect(`/experiences/${existingExperience.id}`);
    }
  }

  const [experience] = await db
    .insert(experiences)
    .values({
      title: normalizedTitle,
      country: normalizedCountry,
      content: normalizedContent,
      authorId: session.user.id,
    })
    .returning({
      id: experiences.id,
    });

  if (tagIds.length > 0) {
    await db.insert(experienceTags).values(
      tagIds.map((tagId) => ({
        experienceId: experience.id,
        tagId,
      }))
    );
  }

  redirect(`/experiences/${experience.id}`);
}

export async function deleteExperience(formData: FormData) {
  const session = await getSession();

  if (!session) {
    throw new Error('ログインしてください');
  }

  const admin = await isAdmin(session.user.id);

  if (!admin) {
    throw new Error('この操作を実行する権限がありません');
  }

  const experienceId = Number(formData.get('experienceId'));

  if (!Number.isInteger(experienceId)) {
    throw new Error('経験談が見つかりません');
  }

  await db
    .update(experiences)
    .set({
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(experiences.id, experienceId),
        isNull(experiences.deletedAt)
      )
    );

  redirect('/experiences');
}

export async function searchExperiences(keyword: string) {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return await db
      .select()
      .from(experiences)
      .where(isNull(experiences.deletedAt))
      .orderBy(desc(experiences.createdAt))
      .limit(20);
  }

  if (trimmedKeyword === 'その他') {
    const majorCountries = countries.filter(
      (country) => country !== 'その他'
    );

    return await db
      .select()
      .from(experiences)
      .where(
        and(
          notInArray(experiences.country, majorCountries),
          isNull(experiences.deletedAt)
        )
      )
      .orderBy(desc(experiences.createdAt));
  }

  const keywords = trimmedKeyword
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const conditions = keywords.map((word) =>
    or(
      ilike(experiences.title, `%${word}%`),
      ilike(experiences.content, `%${word}%`),
      ilike(experiences.country, `%${word}%`)
    )
  );

  return await db
    .select()
    .from(experiences)
    .where(and(...conditions, isNull(experiences.deletedAt)))
    .orderBy(desc(experiences.createdAt));
}
