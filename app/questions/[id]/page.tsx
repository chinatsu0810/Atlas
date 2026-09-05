import { notFound } from 'next/navigation';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

import { db } from '@/lib/db/drizzle';
import {
  answers,
  questionTags,
  questions,
  tags,
  users,
} from '@/lib/db/schema';

import {
  createAnswer,
  deleteAnswer,
  deleteQuestion,
} from '@/lib/questions/actions';

import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/permissions';
import { AnswerForm } from './answer-form';
import { DeleteAnswerButton } from './delete-answer-button';
import { BackButton } from '@/components/back-button';

type Props = {
  params: Promise<{ id: string }>;
};

async function getQuestion(id: number) {
  const result = await db
    .select({
      id: questions.id,
      title: questions.title,
      country: questions.country,
      content: questions.content,
      createdAt: questions.createdAt,
      authorId: questions.authorId,
      authorName: users.name,
    })
    .from(questions)
    .leftJoin(users, eq(questions.authorId, users.id))
    .where(
      and(
        eq(questions.id, id),
        isNull(questions.deletedAt)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;
  const questionId = Number(id);

  if (!Number.isInteger(questionId)) {
    return {};
  }

  const question = await getQuestion(questionId);

  if (!question) {
    return {};
  }

  return {
    title: `${question.title} | Atlas`,
    description: question.content.slice(0, 160),
  };
}

export default async function QuestionPage({ params }: Props) {
  const { id } = await params;
  const questionId = Number(id);

  if (!Number.isInteger(questionId)) {
    notFound();
  }

  const question = await getQuestion(questionId);

  if (!question) {
    notFound();
  }

  const questionTagList = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(questionTags)
    .innerJoin(tags, eq(questionTags.tagId, tags.id))
    .where(eq(questionTags.questionId, questionId));

  const questionAnswers = await db
    .select({
      id: answers.id,
      content: answers.content,
      createdAt: answers.createdAt,
      authorName: users.name,
    })
    .from(answers)
    .leftJoin(users, eq(answers.authorId, users.id))
    .where(
      and(
        eq(answers.questionId, questionId),
        isNull(answers.deletedAt)
      )
    )
    .orderBy(asc(answers.createdAt));

  const session = await getSession();

  const admin = session
    ? await isAdmin(session.user.id)
    : false;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-5 md:px-6 md:py-10">

        {/* 上の戻る */}
        <div className="mb-4 md:mb-8">
          <BackButton />
        </div>

        {/* Question */}
        <article>

          <div className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4">
            {question.country}
          </div>

          {questionTagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-5">
              {questionTagList.map((tag) => (
                <span
                  key={tag.id}
                  className="
                    inline-block
                    rounded-full
                    bg-orange-100
                    px-2.5 py-0.5
                    md:px-3 md:py-1
                    text-xs md:text-sm
                    font-medium
                    text-orange-700
                  "
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4 md:mb-7">
            {question.title}
          </h1>

          <div className="border rounded-xl md:rounded-2xl p-4 md:p-8 bg-background shadow-sm">
            <p className="whitespace-pre-wrap leading-7 md:leading-8 text-[15px] md:text-base">
              {question.content}
            </p>

            <div className="mt-4 md:mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                質問者：{question.authorName || '匿名'}
              </span>

              <span>
                {new Date(question.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>

          {/* Admin Actions */}
          {admin && (
            <div className="mt-4 md:mt-5 flex justify-end">
              <form action={deleteQuestion}>
                <input
                  type="hidden"
                  name="questionId"
                  value={question.id}
                />

                <button
                  type="submit"
                  className="
                    rounded-lg
                    border border-red-300
                    px-3 py-1.5 md:px-4 md:py-2
                    text-xs md:text-sm
                    font-medium
                    text-red-600
                    hover:bg-red-50
                    transition
                  "
                >
                  質問を削除
                </button>
              </form>
            </div>
          )}
        </article>

        {/* Answers */}
        <section className="mt-8 md:mt-12">
          <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-5">
            回答・{questionAnswers.length}件
          </h2>

          {questionAnswers.length === 0 ? (
            <div className="border rounded-xl md:rounded-2xl p-5 md:p-8 text-center bg-muted/20">
              <p className="font-medium text-sm md:text-base mb-2">
                まだ回答がありません
              </p>

              <p className="text-sm text-muted-foreground leading-6">
                この質問について知っていることや、
                <br />
                実際の経験があれば、ぜひ教えてください。
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {questionAnswers.map((answer, index) => (
                <article
                  key={answer.id}
                  className="
                    border
                    rounded-xl md:rounded-2xl
                    p-4 md:p-7
                    bg-background
                    shadow-sm
                  "
                >
                  <div className="flex items-center justify-between gap-4 mb-3 md:mb-4">
                    <div className="text-xs md:text-sm text-muted-foreground">
                      回答・{index + 1}
                      <span className="ml-2">
                        {answer.authorName || '匿名'}
                      </span>
                    </div>

                    {admin && (
                      <DeleteAnswerButton
                        answerId={answer.id}
                        questionId={question.id}
                        action={deleteAnswer}
                      />
                    )}
                  </div>

                  <p className="whitespace-pre-wrap leading-7 md:leading-8 text-[15px] md:text-base">
                    {answer.content}
                  </p>

                  <div className="text-xs text-muted-foreground mt-4 md:mt-5">
                    {new Date(answer.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Answer Form */}
        <section className="mt-8 md:mt-12 border-t pt-7 md:pt-10">
          {session ? (
           <>
  <h2 className="text-lg md:text-xl font-bold mb-2">
    この質問に回答する
  </h2>

  <p className="text-sm text-muted-foreground mb-4 md:mb-5 leading-6">
    相手の立場を尊重し、気持ちよく利用できるコミュニティづくりにご協力ください。
  </p>

  <AnswerForm
    questionId={question.id}
    action={createAnswer}
  />
</>

          ) : (
            <div className="border rounded-xl md:rounded-2xl p-6 md:p-8 text-center bg-muted/20">
              <h2 className="text-base md:text-lg font-bold mb-2">
                回答するにはログインしてください
              </h2>

              <p className="text-sm text-muted-foreground mb-5">
                ログインすると、この質問に回答できます。
              </p>

              <Link
                href="/sign-in"
                className="
                  inline-block
                  bg-orange-500
                  hover:bg-orange-600
                  text-white
                  rounded-lg
                  px-5 py-2.5
                  font-medium
                  text-sm
                  transition
                "
              >
                ログインする
              </Link>
            </div>
          )}
        </section>

        {/* Ask Another Question */}
        <section className="mt-8 md:mt-12 border-t pt-7 md:pt-10 text-center">
          <p className="text-sm text-muted-foreground mb-3 md:mb-4">
            探している情報がまだ見つかりませんか？
          </p>

          <Link
            href="/questions/new"
            className="
              inline-block
              border
              rounded-lg
              px-5 py-2.5
              text-sm
              hover:bg-muted
              transition
            "
          >
            質問する
          </Link>
        </section>

        {/* 下の戻る */}
        <div className="mt-8 md:mt-12 pb-6 md:pb-8">
          <BackButton />
        </div>

      </div>
    </main>
  );
}