export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  console.log('SITEMAP: fetching questions');

  const allQuestions = await db
    .select({
      id: questions.id,
      updatedAt: questions.updatedAt,
    })
    .from(questions);

  console.log('SITEMAP: questions count =', allQuestions.length);

  return [