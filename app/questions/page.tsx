import Link from 'next/link';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { MessageCircle, PlusCircle } from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import { questions, questionTags, tags } from '@/lib/db/schema';

const countryOptions = [
  '中国',
  'インド',
  'アメリカ',
  'インドネシア',
  'オーストラリア',
  'シンガポール',
  'タイ',
];

const themeOptions = [
  '駐在',
  '帯同',
  '移住',
  '留学',
  'ワーホリ',
  '子育て',
  '教育',
  '仕事',
  '住まい',
  'ビザ',
];

type QuestionsPageProps = {
  searchParams: Promise<{
    country?: string;
    theme?: string;
    page?: string;
  }>;
};

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const params = await searchParams;
  const country = params.country?.trim() ?? '';
  const theme = params.theme?.trim() ?? '';

  const parsedPage = Number.parseInt(params.page ?? '1', 10);
  const currentPage = Number.isNaN(parsedPage)
    ? 1
    : Math.max(1, parsedPage);

  const pageSize = 20;
  const offset = (currentPage - 1) * pageSize;

  const conditions = [isNull(questions.deletedAt)];

  if (country) {
    conditions.push(eq(questions.country, country));
  }

  if (theme) {
    const matchingQuestionIds = db
      .select({ questionId: questionTags.questionId })
      .from(questionTags)
      .innerJoin(tags, eq(tags.id, questionTags.tagId))
      .where(eq(tags.name, theme));

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

    if (country) {
      query.set('country', country);
    }

    if (theme) {
      query.set('theme', theme);
    }

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

        <form
          action="/questions"
          method="get"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[#DCEAF2] bg-white p-4 shadow-sm"
        >
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-sm font-medium text-[#406783]">
            国
            <select
              name="country"
              defaultValue={country}
              className="rounded-lg border border-[#D8E7F0] bg-white px-3 py-2 text-sm font-normal text-[#35617E] outline-none focus:border-[#1478B8]"
            >
              <option value="">すべての国</option>
              {countryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-sm font-medium text-[#406783]">
            テーマ
            <select
              name="theme"
              defaultValue={theme}
              className="rounded-lg border border-[#D8E7F0] bg-white px-3 py-2 text-sm font-normal text-[#35617E] outline-none focus:border-[#1478B8]"
            >
              <option value="">すべてのテーマ</option>
              {themeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded-lg bg-[#1478B8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D5686]"
          >
            絞り込む
          </button>

          {(country || theme) && (
            <Link
              href="/questions"
              className="rounded-lg border border-[#D8E7F0] px-5 py-2.5 text-sm text-[#52738B] hover:bg-[#F1F8FC]"
            >
              クリア
            </Link>
          )}
        </form>

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