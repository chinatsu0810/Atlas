import type { MetadataRoute } from 'next';
import { db } from '@/lib/db/drizzle';
import { questions } from '@/lib/db/schema';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allQuestions = await db
    .select({
      id: questions.id,
      updatedAt: questions.updatedAt,
    })
    .from(questions);

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
    ...allQuestions.map((question) => ({
      url: `https://www.atlas-community.jp/questions/${question.id}`,
      lastModified: question.updatedAt,
    })),
  ];
}