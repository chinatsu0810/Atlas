import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm';
import { MessageCircle, Search, Sparkles } from 'lucide-react';
import { SearchKeywordInput } from '@/components/search-keyword-input';
import { db } from '@/lib/db/drizzle';
import {
  experiences,
  experienceTags,
  questions,
  questionTags,
  tags,
} from '@/lib/db/schema';

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

const resultTypes = [
  { value: 'all', label: 'すべて' },
  { value: 'experiences', label: '経験談' },
  { value: 'questions', label: 'Q&A' },
] as const;

type ResultType = (typeof resultTypes)[number]['value'];

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
};

type SearchResult = {
  id: number;
  title: string;
  content: string;
  country: string;
  createdAt: Date;
  tagNames: string[];
};

function toResultType(value?: string): ResultType {
  return resultTypes.some((type) => type.value === value)
    ? (value as ResultType)
    : 'all';
}

function createSearchUrl(query: string, type: ResultType) {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (type !== 'all') params.set('type', type);

  const search = params.toString();
  return search ? `/search?${search}` : '/search';
}

const KATAKANA = 'ァ-ヺー';

// カタカナで始まるキーワードは、直前がカタカナの位置ではマッチさせない
// （「インド」で「マインド」「ウインドウ」がヒットしないようにする）
function matchKeyword(column: AnyColumn, word: string): SQL {
  if (!new RegExp(`^[${KATAKANA}]`).test(word)) {
    return ilike(column, `%${word}%`);
  }

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sql`${column} ~* ${`(^|[^${KATAKANA}])${escaped}`}`;
}

async function searchExperiences(keywords: string[]): Promise<SearchResult[]> {
  const keywordConditions = keywords.map((word) => {
    const matchingExperienceIds = db
      .select({ experienceId: experienceTags.experienceId })
      .from(experienceTags)
      .innerJoin(tags, eq(tags.id, experienceTags.tagId))
      .where(matchKeyword(tags.name, word));

    return or(
      matchKeyword(experiences.title, word),
      matchKeyword(experiences.content, word),
      matchKeyword(experiences.country, word),
      inArray(experiences.id, matchingExperienceIds),
    );
  });

  const rows = await db
    .select({
      id: experiences.id,
      title: experiences.title,
      content: experiences.content,
      country: experiences.country,
      createdAt: experiences.createdAt,
    })
    .from(experiences)
    .where(and(isNull(experiences.deletedAt), ...keywordConditions))
    .orderBy(desc(experiences.createdAt));

  if (rows.length === 0) return [];

  const tagRows = await db
    .select({ id: experienceTags.experienceId, name: tags.name })
    .from(experienceTags)
    .innerJoin(tags, eq(tags.id, experienceTags.tagId))
    .where(
      inArray(
        experienceTags.experienceId,
        rows.map((row) => row.id),
      ),
    );

  return rows.map((row) => ({
    ...row,
    tagNames: tagRows
      .filter((tagRow) => tagRow.id === row.id)
      .map((tagRow) => tagRow.name),
  }));
}

async function searchQuestions(keywords: string[]): Promise<SearchResult[]> {
  const keywordConditions = keywords.map((word) => {
    const matchingQuestionIds = db
      .select({ questionId: questionTags.questionId })
      .from(questionTags)
      .innerJoin(tags, eq(tags.id, questionTags.tagId))
      .where(matchKeyword(tags.name, word));

    return or(
      matchKeyword(questions.title, word),
      matchKeyword(questions.content, word),
      matchKeyword(questions.country, word),
      inArray(questions.id, matchingQuestionIds),
    );
  });

  const rows = await db
    .select({
      id: questions.id,
      title: questions.title,
      content: questions.content,
      country: questions.country,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .where(and(isNull(questions.deletedAt), ...keywordConditions))
    .orderBy(desc(questions.createdAt));

  if (rows.length === 0) return [];

  const tagRows = await db
    .select({ id: questionTags.questionId, name: tags.name })
    .from(questionTags)
    .innerJoin(tags, eq(tags.id, questionTags.tagId))
    .where(
      inArray(
        questionTags.questionId,
        rows.map((row) => row.id),
      ),
    );

  return rows.map((row) => ({
    ...row,
    tagNames: tagRows
      .filter((tagRow) => tagRow.id === row.id)
      .map((tagRow) => tagRow.name),
  }));
}

function ResultCard({
  result,
  kind,
}: {
  result: SearchResult;
  kind: 'experience' | 'question';
}) {
  const isExperience = kind === 'experience';

  return (
    <Link
      href={`/${isExperience ? 'experiences' : 'questions'}/${result.id}`}
      className="block rounded-2xl border border-[#E1EBF1] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isExperience
              ? 'bg-[#E6F6F1] text-[#1F7A62]'
              : 'bg-[#FFF3E6] text-[#B25E12]'
          }`}
        >
          {isExperience ? '経験談' : 'Q&A'}
        </span>

        <span className="rounded-full bg-[#E8F6FC] px-2.5 py-1 text-xs text-[#1478B8]">
          {result.country}
        </span>

        {result.tagNames.slice(0, 3).map((tagName) => (
          <span
            key={tagName}
            className="rounded-full bg-[#F1F5F8] px-2.5 py-1 text-xs text-[#557086]"
          >
            {tagName}
          </span>
        ))}
      </div>

      <h3 className="line-clamp-2 text-base font-semibold leading-7 text-[#174C73]">
        {result.title}
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#668096]">
        {result.content}
      </p>

      <p className="mt-4 text-xs text-[#8AA0B0]">
        {new Date(result.createdAt).toLocaleDateString('ja-JP')}
      </p>
    </Link>
  );
}

function ResultSection({
  title,
  icon,
  results,
  kind,
  emptyMessage,
}: {
  title?: string;
  icon?: ReactNode;
  results: SearchResult[];
  kind: 'experience' | 'question';
  emptyMessage: string;
}) {
  return (
    <section className="mt-6">
      {title && (
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#174C73]">
          <span className="text-[#1478B8]">{icon}</span>
          {title}
          <span className="text-sm font-normal text-[#668096]">
            {results.length}件
          </span>
        </h2>
      )}

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C9DFEA] bg-white px-6 py-10 text-center">
          <p className="text-sm text-[#668096]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <ResultCard key={result.id} result={result} kind={kind} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const type = toResultType(params.type);

  // 全角・半角どちらのスペースにも対応して複数ワード検索できるようにする
  const keywords = query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const [experienceResults, questionResults] = await Promise.all([
    searchExperiences(keywords),
    searchQuestions(keywords),
  ]);

  const counts: Record<ResultType, number> = {
    all: experienceResults.length + questionResults.length,
    experiences: experienceResults.length,
    questions: questionResults.length,
  };

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-8 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[1120px]">
        <form
          action="/search"
          method="get"
          className="mb-8 flex items-center gap-3 rounded-2xl border border-[#C9DFEA] bg-white p-2 shadow-sm"
        >
          <Search className="ml-3 h-5 w-5 shrink-0 text-[#1478B8]" />

          <SearchKeywordInput
            defaultValue={query}
            inputClassName="bg-transparent px-1 py-3 text-base outline-none"
            placeholderClassName="px-1 text-base text-[#8AA0B0]"
          />

          {type !== 'all' && <input type="hidden" name="type" value={type} />}

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
          経験談{counts.experiences}件・Q&A{counts.questions}件が見つかりました
        </p>

        <div className="mt-5 flex gap-1 border-b border-[#DCEAF2]">
          {resultTypes.map((resultType) => {
            const active = resultType.value === type;

            return (
              <Link
                key={resultType.value}
                href={createSearchUrl(query, resultType.value)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
                  active
                    ? 'border-[#1478B8] font-semibold text-[#1478B8]'
                    : 'border-transparent text-[#557086] hover:text-[#1478B8]'
                }`}
              >
                {resultType.label}
                <span className="ml-1.5 text-xs text-[#8AA0B0]">
                  {counts[resultType.value]}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="mr-1 self-center text-sm font-semibold text-[#406783]">
            絞り込み
          </span>

          {filterTags.map((tag) => (
            <Link
              key={tag}
              href={createSearchUrl(tag, type)}
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

        {type === 'all' ? (
          <>
            <ResultSection
              title="経験談"
              icon={<Sparkles className="h-5 w-5" />}
              results={experienceResults}
              kind="experience"
              emptyMessage="該当する経験談が見つかりませんでした。"
            />
            <ResultSection
              title="Q&A"
              icon={<MessageCircle className="h-5 w-5" />}
              results={questionResults}
              kind="question"
              emptyMessage="該当する質問が見つかりませんでした。"
            />
          </>
        ) : (
          <ResultSection
            results={type === 'experiences' ? experienceResults : questionResults}
            kind={type === 'experiences' ? 'experience' : 'question'}
            emptyMessage={
              type === 'experiences'
                ? '該当する経験談が見つかりませんでした。'
                : '該当する質問が見つかりませんでした。'
            }
          />
        )}
      </div>
    </main>
  );
}
