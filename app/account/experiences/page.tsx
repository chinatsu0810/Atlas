import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { db } from '@/lib/db/drizzle';
import { experiences } from '@/lib/db/schema';
import { desc, eq, isNull, and } from 'drizzle-orm';

import { getUser } from '@/lib/db/queries';

export default async function MyExperiencesPage() {
  const user = await getUser();

  const myExperiences = user
    ? await db
        .select()
        .from(experiences)
        .where(
          and(
            eq(experiences.authorId, user.id),
            isNull(experiences.deletedAt)
          )
        )
        .orderBy(desc(experiences.createdAt))
    : [];

  return (
    <section className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">

        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            自分の経験
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            投稿した経験談を確認できます。
          </p>
        </div>

        {myExperiences.length === 0 ? (
          <div className="border rounded-xl p-6 md:p-8 text-center bg-muted/20">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

            <h2 className="font-semibold text-sm md:text-base">
              まだ経験談を投稿していません
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              海外生活での経験を投稿してみましょう。
            </p>

            <Link
              href="/experiences/new"
              className="mt-5 inline-block rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              経験談を投稿する
            </Link>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {myExperiences.map((experience) => (
              <Link
                key={experience.id}
                href={`/experiences/${experience.id}`}
                className="block"
              >
                <div className="border rounded-xl p-4 md:p-5 hover:bg-muted transition">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1.5">
                    {experience.country}
                  </div>

                  <h2 className="text-sm md:text-base font-semibold mb-1.5">
                    {experience.title}
                  </h2>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {experience.content}
                  </p>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {new Date(experience.createdAt).toLocaleDateString('ja-JP')}
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
