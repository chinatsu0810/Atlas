import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';

import { db } from '@/lib/db/drizzle';
import { questions } from '@/lib/db/schema';
import { desc, eq, isNull, and } from 'drizzle-orm';

import { getUser } from '@/lib/db/queries';

export default async function MyQuestionsPage() {
  const user = await getUser();

  const myQuestions = user
    ? await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.authorId, user.id),
            isNull(questions.deletedAt)
          )
        )
        .orderBy(desc(questions.createdAt))
    : [];

  return (
    <section className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">

        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            自分の質問
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            投稿した質問を確認できます。
          </p>
        </div>

        {myQuestions.length === 0 ? (
          <div className="border rounded-xl p-6 md:p-8 text-center bg-muted/20">
            <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

            <h2 className="font-semibold text-sm md:text-base">
              まだ質問を投稿していません
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              海外生活で知りたいことを質問してみましょう。
            </p>

            <Link
              href="/questions/new"
              className="mt-5 inline-block rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              質問する
            </Link>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {myQuestions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="block"
              >
                <div className="border rounded-xl p-4 md:p-5 hover:bg-muted transition">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1.5">
                    {question.country}
                  </div>

                  <h2 className="text-sm md:text-base font-semibold mb-1.5">
                    {question.title}
                  </h2>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {question.content}
                  </p>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {new Date(question.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 md:mt-10">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイページに戻る
          </Link>
        </div>

      </div>
    </section>
  );
}