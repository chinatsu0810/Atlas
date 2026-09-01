import Link from 'next/link';

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { tags } from '@/lib/db/schema';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { BackButton } from '@/components/back-button';
import QuestionForm from './question-form';

export default async function NewQuestionPage() {
  const session = await getSession();

  const tagList = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(tags);

  return (
    <section className="flex-1 p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>質問する</CardTitle>
        </CardHeader>

        {!session ? (
          <CardContent>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                質問するにはログインが必要です。
              </p>

              <div className="flex gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                >
                  ログイン
                </Link>

                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  新規登録
                </Link>
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <QuestionForm tags={tagList} />
          </CardContent>
        )}
      </Card>

      <div className="mt-8 mb-16">
        <BackButton />
      </div>
    </section>
  );
}
