import { notFound } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

import { db } from '@/lib/db/drizzle';
import { experienceTags, experiences, tags, users } from '@/lib/db/schema';
import { deleteExperience } from '@/lib/experiences/actions';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/permissions';
import { displayAuthorName } from '@/lib/users/display';
import { BackButton } from '@/components/back-button';

type Props = {
  params: Promise<{ id: string }>;
};

async function getExperience(id: number) {
  const result = await db
    .select({
      id: experiences.id,
      title: experiences.title,
      country: experiences.country,
      content: experiences.content,
      createdAt: experiences.createdAt,
      authorId: experiences.authorId,
      authorName: users.name,
      authorDeletedAt: users.deletedAt,
    })
    .from(experiences)
    .leftJoin(users, eq(experiences.authorId, users.id))
    .where(
      and(
        eq(experiences.id, id),
        isNull(experiences.deletedAt)
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
  const experienceId = Number(id);

  if (!Number.isInteger(experienceId)) {
    return {};
  }

  const experience = await getExperience(experienceId);

  if (!experience) {
    return {};
  }

  return {
    title: experience.title,

    description: experience.content.slice(0, 160),

    alternates: {
      canonical: `/experiences/${experience.id}`,
    },

    openGraph: {
      title: experience.title,
      description: experience.content.slice(0, 160),
      url: `/experiences/${experience.id}`,
      type: 'article',
    },
  };
}

export default async function ExperiencePage({ params }: Props) {
  const { id } = await params;
  const experienceId = Number(id);

  if (!Number.isInteger(experienceId)) {
    notFound();
  }

  const experience = await getExperience(experienceId);

  if (!experience) {
    notFound();
  }

  const experienceTagList = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(experienceTags)
    .innerJoin(tags, eq(experienceTags.tagId, tags.id))
    .where(eq(experienceTags.experienceId, experienceId));

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

        {/* Experience */}
        <article>

          <div className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4">
            {experience.country}
          </div>

          {experienceTagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-5">
              {experienceTagList.map((tag) => (
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
            {experience.title}
          </h1>

          <div className="border rounded-xl md:rounded-2xl p-4 md:p-8 bg-background shadow-sm">
            <p className="whitespace-pre-wrap leading-7 md:leading-8 text-[15px] md:text-base">
              {experience.content}
            </p>

            <div className="mt-4 md:mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                投稿者：
                {displayAuthorName(
                  experience.authorName,
                  experience.authorDeletedAt
                )}
              </span>

              <span>
                {new Date(experience.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>

          {/* Admin Actions */}
          {admin && (
            <div className="mt-4 md:mt-5 flex justify-end gap-2">
              <form action={deleteExperience}>
                <input
                  type="hidden"
                  name="experienceId"
                  value={experience.id}
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
                  経験談を削除
                </button>
              </form>
            </div>
          )}
        </article>

        {/* Share Another Experience */}
        <section className="mt-8 md:mt-12 border-t pt-7 md:pt-10 text-center">
          <p className="text-sm text-muted-foreground mb-3 md:mb-4">
            あなたの経験も、誰かのヒントになるかもしれません。
          </p>

          <Link
            href="/experiences/new"
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
            経験談を投稿する
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
