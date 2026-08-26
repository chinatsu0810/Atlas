import Link from 'next/link';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import {
  MessageCircle,
  PlusCircle,
  Globe2,
  MapPin,
} from 'lucide-react';

import { db } from '@/lib/db/drizzle';
import { questions } from '@/lib/db/schema';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

const categories = [
  {
    name: 'アメリカ',
    emoji: '🇺🇸',
  },
  {
    name: 'オーストラリア',
    emoji: '🇦🇺',
  },
  {
    name: 'シンガポール',
    emoji: '🇸🇬',
  },
  {
    name: 'その他海外',
    emoji: '🌎',
  },
];

export default async function DashboardPage() {
  const session = await getSession();

  const myQuestions = session
    ? await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.authorId, session.user.id),
            isNull(questions.deletedAt)
          )
        )
        .orderBy(desc(questions.createdAt))
    : [];

  const latestQuestions = await db
    .select({
      id: questions.id,
      title: questions.title,
      content: questions.content,
      country: questions.country,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .where(isNull(questions.deletedAt))
    .orderBy(desc(questions.createdAt))
    .limit(10);

  const otherQuestions = session
    ? latestQuestions.filter(
        (question) =>
          !myQuestions.some(
            (myQuestion) => myQuestion.id === question.id
          )
      )
    : latestQuestions;

  return (
    <section className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto">

      {/* Hero */}
      <div className="mb-10">

        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Globe2 className="h-4 w-4" />
          Atlas
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-4">
          海外生活で「知りたいこと」を
          <br />
          経験者に聞ける場所
        </h1>

        <p className="text-muted-foreground mb-6 leading-7">
          海外で暮らしている人の質問や回答から、
          <br />
          自分が知りたい情報を探してみましょう。
        </p>

        <Link href="/questions/new">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <PlusCircle className="mr-2 h-4 w-4" />
            質問する
          </Button>
        </Link>

      </div>

      {/* 自分の質問 */}
      {session && myQuestions.length > 0 && (
        <Card className="mb-8">

          <CardHeader>
            <CardTitle>
              自分の質問
            </CardTitle>
          </CardHeader>

          <CardContent>

            <div className="space-y-4">

              {myQuestions.map((question) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="block"
                >
                  <div className="border rounded-xl p-4 hover:bg-muted transition">

                    <div className="text-sm text-muted-foreground mb-2">
                      {question.country}
                    </div>

                    <h3 className="font-semibold">
                      {question.title}
                    </h3>

                  </div>
                </Link>
              ))}

            </div>

          </CardContent>

        </Card>
      )}

      {/* Categories */}
      <Card className="mb-8">

        <CardHeader>
          <CardTitle>
            国・地域から探す
          </CardTitle>
        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/search?q=${encodeURIComponent(category.name)}`}
              >
                <div
                  className="
                    border rounded-xl p-4
                    hover:bg-muted
                    transition
                  "
                >

                  <div className="text-3xl mb-2">
                    {category.emoji}
                  </div>

                  <div className="font-medium">
                    {category.name}
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    質問を見る
                  </div>

                </div>
              </Link>
            ))}

          </div>

        </CardContent>

      </Card>

      {/* 最新の質問 */}
      <Card>

        <CardHeader>
          <CardTitle>
            最新の質問
          </CardTitle>
        </CardHeader>

        <CardContent>

          {otherQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              まだ他のユーザーからの質問はありません。
            </div>
          ) : (
            <div className="space-y-4">

              {otherQuestions.map((question) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="block"
                >
                  <div
                    className="
                      border rounded-xl p-4
                      hover:bg-muted
                      transition
                    "
                  >

                    <div className="text-sm text-muted-foreground mb-2">
                      {question.country}
                    </div>

                    <h3 className="font-semibold mb-2">
                      {question.title}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {question.content}
                    </p>

                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {question.country}
                    </div>

                  </div>
                </Link>
              ))}

            </div>
          )}

        </CardContent>

      </Card>

      {/* 回答を共有する */}
      <section className="mt-10 border-t pt-10 text-center">

        <MessageCircle className="h-8 w-8 mx-auto mb-4 text-orange-500" />

        <h2 className="text-2xl font-bold mb-3">
          知っていることがありませんか？
        </h2>

        <p className="text-muted-foreground mb-6">
          あなたの海外生活の経験が、
          <br />
          誰かの役に立つかもしれません。
        </p>

        <Link href="/search">
          <Button variant="outline">
            質問を探して回答する
          </Button>
        </Link>

      </section>

    </section>
  );
}
