import Link from 'next/link';

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

  const results = await searchQuestions(keyword);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-4xl mx-auto">

        {/* 上の戻る */}
        <div className="mb-8">
          <BackButton />
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mt-6 mb-3">
            海外生活で「知りたいこと」を検索
          </h1>

          <p className="text-muted-foreground">
            実際に海外で暮らす人の質問や回答から探してみてください。
          </p>
        </div>

        {/* Search */}
        <form
          action="/search"
          method="get"
          className="flex gap-3 mb-12"
        >
          <input
            name="q"
            type="search"
            defaultValue={keyword}
            placeholder="例：インド ローカル校 小学生 赴任"
            className="
              flex-1
              border
              rounded-lg
              px-4
              py-3
              text-base
              focus:outline-none
              focus:ring-2
              focus:ring-orange-500
            "
          />

          <Button
            type="submit"
            className="
              bg-orange-500
              hover:bg-orange-600
              text-white
              px-6
            "
          >
            検索
          </Button>
        </form>

        {/* キーワードなし：最新の質問 */}
        {!keyword && (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                最新の質問
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                最近投稿された質問を表示しています。
              </p>
            </div>

            {results.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-5">
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
              <div className="space-y-4">
                {results.map((question) => (
                  <Link
                    key={question.id}
                    href={`/questions/${question.id}`}
                    className="
                      block
                      border
                      rounded-lg
                      p-5
                      hover:bg-muted
                      transition
                    "
                  >
                    <div className="text-sm text-muted-foreground mb-2">
                      {question.country}
                    </div>

                    <h2 className="text-lg font-semibold mb-2">
                      {question.title}
                    </h2>

                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {question.content}
                    </p>

                    <div className="mt-4 text-sm text-orange-600">
                      質問と回答を見る →
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-10 text-center">
                <Link
                  href="/questions/new"
                  className="
                    inline-block
                    border
                    rounded-lg
                    px-5
                    py-3
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
          <div className="border rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-3">
              「{keyword}」に近い質問が見つかりませんでした
            </h2>

            <p className="text-muted-foreground mb-6">
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
            <div className="mb-5">
              <p className="text-sm text-muted-foreground">
                「{keyword}」に関連する質問
              </p>

              <p className="text-2xl font-bold mt-1">
                {results.length}件
              </p>
            </div>

            <div className="space-y-4">
              {results.map((question) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="
                    block
                    border
                    rounded-lg
                    p-5
                    hover:bg-muted
                    transition
                  "
                >
                  <div className="text-sm text-muted-foreground mb-2">
                    {question.country}
                  </div>

                  <h2 className="text-lg font-semibold mb-2">
                    {question.title}
                  </h2>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {question.content}
                  </p>

                  <div className="mt-4 text-sm text-orange-600">
                    質問と回答を見る →
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 border-t pt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                知りたい情報が見つからなければ、質問してみてください。
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
        <div className="mt-12 pb-8">
          <BackButton />
        </div>

      </div>
    </main>
  );
}