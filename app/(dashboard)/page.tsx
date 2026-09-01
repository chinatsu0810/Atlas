import Link from 'next/link';
import { Search, MessageCircle, PlusCircle } from 'lucide-react';

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
    <section className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Hero */}
      <div className="mb-8 md:mb-10">
       <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight mb-4">
  海外生活で「知りたいこと」を経験者に聞ける場所
</h1>

        <p className="text-sm md:text-base text-muted-foreground leading-7 mb-5 md:mb-6 max-w-2xl">
          海外で暮らしている人の質問や回答から、自分が知りたい情報を探してみましょう。
        </p>

        <div className="flex flex-wrap gap-2 md:gap-3">
          <Link href="/search">
            <Button
              size="lg"
              className="h-10 px-3 md:px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Search className="mr-2 h-4 w-4" />
              質問を検索する
            </Button>
          </Link>

          <Link href="/questions/new">
            <Button
              size="lg"
              variant="outline"
              className="h-10 px-3 md:px-4 text-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              質問する
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">

        <Link href="/search">
          <Card className="h-full hover:bg-muted/50 transition cursor-pointer">
            <CardContent className="p-3 md:p-4 flex items-start gap-3">
              <Search className="h-5 w-5 mt-0.5 shrink-0 text-orange-500" />

              <div>
                <h2 className="font-bold text-base mb-1">
                  知りたいことを検索
                </h2>

                <p className="text-sm text-muted-foreground">
                  国やキーワードから海外生活の質問を探せます。
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/questions/new">
          <Card className="h-full hover:bg-muted/50 transition cursor-pointer">
            <CardContent className="p-3 md:p-4 flex items-start gap-3">
              <MessageCircle className="h-5 w-5 mt-0.5 shrink-0 text-orange-500" />

              <div>
                <h2 className="font-bold text-base mb-1">
                  質問する
                </h2>

                <p className="text-sm text-muted-foreground">
                  探しても見つからないことは、経験者に聞いてみましょう。
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* Countries */}
      <Card className="mb-8 md:mb-10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">
            国・地域から探す
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {countries.map((country) => (
              <Link
                key={country}
                href={`/search?q=${encodeURIComponent(country)}`}
                className="
                  border rounded-lg
                  px-3 py-2.5
                  text-center text-sm
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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg md:text-xl">
            最新の質問
          </CardTitle>

          <Link
            href="/search"
            className="text-sm text-muted-foreground hover:underline"
          >
            すべて見る →
          </Link>
        </CardHeader>

        <CardContent className="pt-0">
          {latestQuestions.length === 0 ? (
            <div className="text-center py-8 md:py-10">
              <p className="text-sm md:text-base text-muted-foreground mb-4">
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
                      border rounded-xl
                      p-4 md:p-5
                      hover:bg-muted
                      transition
                    "
                  >
                    <div className="text-xs md:text-sm text-muted-foreground mb-1.5 md:mb-2">
                      {question.country}
                    </div>

                    <h3 className="text-base md:text-lg font-semibold mb-1.5 md:mb-2">
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