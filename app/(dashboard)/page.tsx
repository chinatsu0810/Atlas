import Link from 'next/link';
import { Search, MessageCircle, PlusCircle, Globe2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { db } from '@/lib/db/drizzle';
import { questions } from '@/lib/db/schema';
import { desc, isNull } from 'drizzle-orm';

import { countries } from '@/lib/constants/countries';

export default async function DashboardPage() {
  const latestQuestions = await db
    .select()
    .from(questions)
    .where(isNull(questions.deletedAt))
    .orderBy(desc(questions.createdAt))
    .limit(10);

  return (
    <section className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto">

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Globe2 className="h-4 w-4" />
          Atlas
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          海外生活で「知りたいこと」を
          <br />
          経験者に聞ける場所
        </h1>

        <p className="text-muted-foreground leading-7 mb-6 max-w-2xl">
          海外で暮らしている人の質問や回答から、
          <br className="hidden md:block" />
          自分が知りたい情報を探してみましょう。
        </p>

        <div className="flex flex-wrap gap-3">
         <Link href="/search">
  <Button
    size="lg"
    className="bg-orange-500 hover:bg-orange-600 text-white"
  >
    <Search className="mr-2 h-5 w-5" />
    質問を検索する
  </Button>
</Link>

<Link href="/questions/new">
  <Button size="lg" variant="outline">
    <PlusCircle className="mr-2 h-5 w-5" />
    質問する
  </Button>
</Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">

        <Link href="/search">
          <Card className="h-full hover:bg-muted/50 transition cursor-pointer">
            <CardContent className="p-6">
              <Search className="h-6 w-6 mb-4 text-orange-500" />

              <h2 className="font-bold text-lg mb-2">
                知りたいことを検索
              </h2>

              <p className="text-sm text-muted-foreground">
                国やキーワードから海外生活の質問を探せます。
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/questions/new">
          <Card className="h-full hover:bg-muted/50 transition cursor-pointer">
            <CardContent className="p-6">
              <MessageCircle className="h-6 w-6 mb-4 text-orange-500" />

              <h2 className="font-bold text-lg mb-2">
                質問する
              </h2>

              <p className="text-sm text-muted-foreground">
                探しても見つからないことは、経験者に聞いてみましょう。
              </p>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* Countries */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle>
            国・地域から探す
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {countries.map((country) => (
              <Link
                key={country}
                href={`/search?q=${encodeURIComponent(country)}`}
                className="
                  border rounded-lg p-4
                  text-center
                  hover:bg-muted
                  transition
                "
              >
                {country}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latest Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            最新の質問
          </CardTitle>

          <Link
            href="/search"
            className="text-sm text-muted-foreground hover:underline"
          >
            すべて見る →
          </Link>
        </CardHeader>

        <CardContent>
          {latestQuestions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">
                まだ質問がありません。
              </p>

              <Link href="/questions/new">
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  最初の質問をする
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {latestQuestions.map((question) => (
                <Link
                  key={question.id}
                  href={`/questions/${question.id}`}
                  className="block"
                >
                  <div
                    className="
                      border rounded-xl p-5
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </section>
  );
}