import Link from 'next/link';
import { and, desc, inArray, isNull, notInArray, or } from 'drizzle-orm';
import { MessageCircle, PlusCircle } from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import { questions, questionTags, tags } from '@/lib/db/schema';
import { countries } from '@/lib/constants/countries';
import { BrowseFilterForm } from '@/components/browse-filter-form';

type QuestionsPageProps = {
  searchParams: Promise<{
    country?: string | string[];
    tagIds?: string | string[];
    page?: string;
  }>;
};

function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const params = await searchParams;

  const selectedCountries = toArray(params.country);

  const selectedTagIds = toArray(params.tagIds)
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);

  const parsedPage = Number.parseInt(params.page ?? '1', 10);
  const currentPage = Number.isNaN(parsedPage)
    ? 1
    : Math.max(1, parsedPage);

  const pageSize = 20;
  const offset = (currentPage - 1) * pageSize;

  const tagList = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      category: tags.category,
    })
    .from(tags);

  const conditions = [isNull(questions.deletedAt)];

  if (selectedCountries.length > 0) {
    const hasOther = selectedCountries.includes('その他');
    const regularCountries = selectedCountries.filter(
      (country) => country !== 'その他'
    );

    const countryConditions = [];

    if (regularCountries.length > 0) {
      countryConditions.push(
        inArray(questions.country, regularCountries)
      );
    }

    if (hasOther) {
      const majorCountries = countries.filter(
        (country) => country !== 'その他'
      );

      countryConditions.push(
        notInArray(questions.country, majorCountries)
      );
    }

    conditions.push(or(...countryConditions)!);
  }

  const selectedTagIdsByCategory = new Map<string, number[]>();

  for (const tagId of selectedTagIds) {
    const tag = tagList.find((item) => item.id === tagId);

    if (!tag) continue;

    const current = selectedTagIdsByCategory.get(tag.category) ?? [];
    current.push(tagId);
    selectedTagIdsByCategory.set(tag.category, current);
  }

  for (const categoryTagIds of selectedTagIdsByCategory.values()) {
    const matchingQuestionIds = db
      .select({ questionId: questionTags.questionId })
      .from(questionTags)
      .where(inArray(questionTags.tagId, categoryTagIds));

    conditions.push(inArray(questions.id, matchingQuestionIds));
  }

  const questionList = await db
    .select()
    .from(questions)
    .where(and(...conditions))
    .orderBy(desc(questions.createdAt))
    .limit(pageSize + 1)
    .offset(offset);

  const hasNextPage = questionList.length > pageSize;
  const visibleQuestions = questionList.slice(0, pageSize);

  const createPageUrl = (page: number) => {
    const query = new URLSearchParams();

    selectedCountries.forEach((country) => {
      query.append('country', country);
    });

    selectedTagIds.forEach((tagId) => {
      query.append('tagIds', String(tagId));
    });

    query.set('page', String(page));

    return `/questions?${query.toString()}`;
  };

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-8 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#1478B8]" />
              <h1 className="text-xl font-bold">回答募集中の質問</h1>
            </div>

            <p className="mt-2 text-sm text-[#668096]">
              みんなが知りたいことに、あなたの経験で答えてみませんか？
            </p>
          </div>

          <Link
            href="/questions/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1478B8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5686]"
          >
            <PlusCircle className="h-4 w-4" />
            質問を投稿する
          </Link>
        </div>

        <BrowseFilterForm
          action="/questions"
          countries={countries}
          selectedCountries={selectedCountries}
          tags={tagList}
          selectedTagIds={selectedTagIds}
        />

        {visibleQuestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C9DFEA] bg-white px-6 py-16 text-center">
            <p className="text-sm text-[#668096]">
              条件に一致する回答募集中の質問はありません。
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleQuestions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="block rounded-2xl border border-[#E1EBF1] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="inline-block rounded-full bg-[#E8F6FC] px-2.5 py-1 text-xs text-[#1478B8]">
                  {question.country}
                </span>

                <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-7 text-[#174C73]">
                  {question.title}
                </h2>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#668096]">
                  {question.content}
                </p>

                <div className="mt-4 border-t border-[#E8EEF2] pt-3 text-xs text-[#8AA0B0]">
                  {new Date(question.createdAt).toLocaleDateString('ja-JP')}
                </div>
              </Link>
            ))}
          </div>
        )}

        {(currentPage > 1 || hasNextPage) && (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {currentPage > 1 && (
              <Link
                href={createPageUrl(currentPage - 1)}
                className="rounded-lg border border-[#D8E7F0] bg-white px-4 py-2 text-sm text-[#35617E] hover:bg-[#F1F8FC]"
              >
                前へ
              </Link>
            )}

            <span className="text-sm text-[#668096]">
              {currentPage}ページ
            </span>

            {hasNextPage && (
              <Link
                href={createPageUrl(currentPage + 1)}
                className="rounded-lg bg-[#1478B8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D5686]"
              >
                次へ
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
