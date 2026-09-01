import Link from 'next/link';
import { desc, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { questions } from '@/lib/db/schema';

import { searchQuestions } from '@/lib/questions/actions';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/back-button';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const keyword = params.q?.trim() ?? '';

  const results = keyword
  ? await searchQuestions(keyword)
  : await db
      .select()
      .from(questions)
      .where(isNull(questions.deletedAt))
      .orderBy(desc(questions.createdAt))
      .limit(10);

  return (
    <main className="min-h-screen px-4 py-5 md:px-6 md:py-6">
      <div className="max-w-4xl mx-auto">

        {/* 上の戻る */}
        <div className="mb-5">
          <BackButton />
        </div>

      {/* Header */}
<div className="mb-4">
  <h1 className="text-xl md:text-2xl font-bold tracking-tight">
    海外生活で「知りたいこと」を検索
  </h1>
</div>

        {/* Search */}
        <form
          action="/search"
          method="get"
          className="flex gap-2 mb-6"
        >
          <input
            name="q"
            type="search"
            defaultValue={keyword}
            placeholder="例：インド ローカル校 小学生 赴任"
            className="
              flex-1
              min-w-0
              border
              rounded-lg
              px-3
              py-2.5
              text-sm
              md:text-base
              focus:outline-none
              focus:ring-2
              focus:ring-orange-500
            "
          />

          <Button
            type="submit"
            className="
              shrink-0
              bg-orange-500
              hover:bg-orange-600
              text-white
              px-4
            "
          >
            検索
          </Button>
        </form>

        {/* キーワードなし：最新の質問 */}
        {!keyword && (
          <section>
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-bold">
                最新の質問
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                最近投稿された質問を表示しています。
              </p>
            </div>

            {results.length === 0 ? (
              <div className="border rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  まだ質問がありません。
                </p>

                <Link href="/questions/new">
                  <Button
                    className="
                      bg-orange-500
                      hover:bg-orange-600
                      text-white
                    "
                  >
                    最初の質問をする
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((question) => (
                  <Link
                    key={question.id}
                    href={`/questions/${question.id}`}
                    className="
                      block
                      border
                      rounded-lg
                      p-4
                      hover:bg-muted
                      transition
                    "
                  >
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {question.country}
                    </div>

                    <h2 className="text-base md:text-lg font-semibold mb-1.5">
                      {question.title}
                    </h2>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {question.content}
                    </p>

                    <div className="mt-3 text-sm text-orange-600">
                      質問と回答を見る →
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-6 text-center">
                <Link
                  href="/questions/new"
                  className="
                    inline-block
                    border
                    rounded-lg
                    px-5
                    py-2.5
                    text-sm
                    hover:bg-muted
                    transition
                  "
                >
                  質問を投稿する
                </Link>
              </div>
            )}
          </section>
        )}

        {/* キーワードあり・結果なし */}
        {keyword && results.length === 0 && (
          <div className="border rounded-lg p-6 md:p-6 text-center">
            <h2 className="text-lg md:text-xl font-semibold mb-3">
              「{keyword}」に近い質問が見つかりませんでした
            </h2>

            <p className="text-sm md:text-base text-muted-foreground mb-5">
              まだAtlasに回答がないのかもしれません。
              <br />
              あなたの状況を質問してみませんか？
            </p>

            <Link href="/questions/new">
              <Button
                className="
                  bg-orange-500
                  hover:bg-orange-600
                  text-white
                "
              >
                この内容で質問する
              </Button>
            </Link>
          </div>
        )}

        {/* キーワードあり・結果あり */}
        {keyword && results.length > 0 && (
          <section>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                「{keyword}」に関連する質問
              </p>

              <p className="text-xl md:text-2xl font-bold mt-0.5">
                {results.length}件
              </p>
            </div>

            <div className="space-y-3">
              {results.map((question) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="
                    block
                    border
                    rounded-lg
                    p-4
                    hover:bg-muted
                    transition
                  "
                >
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {question.country}
                  </div>

                  <h2 className="text-base md:text-lg font-semibold mb-1.5">
                    {question.title}
                  </h2>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {question.content}
                  </p>

                  <div className="mt-3 text-sm text-orange-600">
                    質問と回答を見る →
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 border-t pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4 leading-6">
  知りたい情報が見つからなければ、
  <br className="md:hidden" />
  質問してみてください。
</p>

              <Link href="/questions/new">
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  質問を投稿する
                </Button>
              </Link>
            </div>
          </section>
        )}

        {/* 下の戻る */}
        <div className="mt-8 pb-6">
          <BackButton />
        </div>

      </div>
    </main>
  );
}