import Link from 'next/link';
import { and, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { db } from '@/lib/db/drizzle';
import { questions, questionTags, tags } from '@/lib/db/schema';

const filterTags = [
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


type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';

  // 全角・半角どちらのスペースにも対応して複数ワード検索できるようにする
  const keywords = query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const keywordConditions = keywords.map((word) => {
    const pattern = `%${word}%`;

    const matchingQuestionIds = db
      .select({ questionId: questionTags.questionId })
      .from(questionTags)
      .innerJoin(tags, eq(tags.id, questionTags.tagId))
      .where(ilike(tags.name, pattern));

    return or(
      ilike(questions.title, pattern),
      ilike(questions.content, pattern),
      ilike(questions.country, pattern),
      inArray(questions.id, matchingQuestionIds),
    );
  });

  const rows = await db
    .select({
      question: questions,
      tagName: tags.name,
    })
    .from(questions)
    .leftJoin(
      questionTags,
      eq(questionTags.questionId, questions.id),
    )
    .leftJoin(tags, eq(tags.id, questionTags.tagId))
    .where(and(isNull(questions.deletedAt), ...keywordConditions))
    .orderBy(desc(questions.createdAt));

  const resultMap = new Map<
    number,
    {
      question: (typeof rows)[number]['question'];
      tagNames: string[];
    }
  >();

  for (const row of rows) {
    const existing = resultMap.get(row.question.id);

    if (existing) {
      if (row.tagName && !existing.tagNames.includes(row.tagName)) {
        existing.tagNames.push(row.tagName);
      }
      continue;
    }

    resultMap.set(row.question.id, {
      question: row.question,
      tagNames: row.tagName ? [row.tagName] : [],
    });
  }

  const results = Array.from(resultMap.values());

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-8 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <form
          action="/search"
          method="get"
          className="mb-8 flex items-center gap-3 rounded-2xl border border-[#C9DFEA] bg-white p-2 shadow-sm"
        >
          <Search className="ml-3 h-5 w-5 shrink-0 text-[#1478B8]" />

          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="国・都市・タグ・キーワードで検索"
            className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base outline-none placeholder:text-[#8AA0B0]"
          />

          <button
            type="submit"
            className="rounded-full bg-[#1478B8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0D5686]"
          >
            検索
          </button>
        </form>

        <h1 className="text-xl font-bold text-[#123B5D]">
          {query ? `「${query}」の検索結果` : '経験を探す'}
        </h1>

        <p className="mt-2 text-sm text-[#668096]">
          {results.length}件の質問が見つかりました
        </p>

<div className="mt-5 flex flex-wrap gap-2">
  <span className="mr-1 self-center text-sm font-semibold text-[#406783]">
    絞り込み
  </span>

  {filterTags.map((tag) => (
    <Link
      key={tag}
      href={`/search?q=${encodeURIComponent(tag)}`}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        query === tag
          ? 'border-[#1478B8] bg-[#1478B8] text-white'
          : 'border-[#D8E7F0] bg-white text-[#35617E] hover:bg-[#F1F8FC]'
      }`}
    >
      {tag}
    </Link>
  ))}
</div>



        {results.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#C9DFEA] bg-white px-6 py-16 text-center">
            <p className="text-sm text-[#668096]">
              該当する質問が見つかりませんでした。
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map(({ question, tagNames }) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="block rounded-2xl border border-[#E1EBF1] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#E8F6FC] px-2.5 py-1 text-xs text-[#1478B8]">
                    {question.country}
                  </span>

                  {tagNames.map((tagName) => (
                    <span
                      key={tagName}
                      className="rounded-full bg-[#F1F5F8] px-2.5 py-1 text-xs text-[#557086]"
                    >
                      {tagName}
                    </span>
                  ))}
                </div>

                <h2 className="line-clamp-2 text-base font-semibold leading-7 text-[#174C73]">
                  {question.title}
                </h2>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#668096]">
                  {question.content}
                </p>

                <p className="mt-4 text-xs text-[#8AA0B0]">
                  {new Date(question.createdAt).toLocaleDateString('ja-JP')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}