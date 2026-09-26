import type { MetadataRoute } from 'next';
import { and, isNull, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { experiences, giveaways, questions } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allQuestions = await db
    .select({
      id: questions.id,
      updatedAt: questions.updatedAt,
    })
    .from(questions)
    .where(isNull(questions.deletedAt));

  const allExperiences = await db
    .select({
      id: experiences.id,
      updatedAt: experiences.updatedAt,
    })
    .from(experiences)
    .where(isNull(experiences.deletedAt));

  const openGiveaways = await db
    .select({
      id: giveaways.id,
      updatedAt: giveaways.updatedAt,
    })
    .from(giveaways)
    .where(and(eq(giveaways.status, 'open'), isNull(giveaways.deletedAt)));

  return [
    {
      url: 'https://www.atlas-community.jp',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/search',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/questions',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/experiences',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/pricing',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/about',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/contact',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/privacy',
      lastModified: new Date(),
    },
    {
      url: 'https://www.atlas-community.jp/terms',
      lastModified: new Date(),
    },
    ...allQuestions.map((question) => ({
      url: `https://www.atlas-community.jp/questions/${question.id}`,
      lastModified: question.updatedAt,
    })),
    ...allExperiences.map((experience) => ({
      url: `https://www.atlas-community.jp/experiences/${experience.id}`,
      lastModified: experience.updatedAt,
    })),
  ];
}