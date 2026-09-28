import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, inArray, isNull, notInArray } from 'drizzle-orm';
import {
  BadgeCheck,
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Sparkles,
  Ticket,
  UsersRound,
  Video,
} from 'lucide-react';

import { BackButton } from '@/components/back-button';
import { gatherPlaceLabel } from '@/components/gather/event-row';
import { isAdmin } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import {
  experienceTags,
  experiences,
  questionTags,
  questions,
  tags,
} from '@/lib/db/schema';
import { GATHER_SOURCES } from '@/lib/gather/constants';
import { dateParts, formatEventDate } from '@/lib/gather/dates';
import { getGatherEvent } from '@/lib/gather/queries';

type Props = {
  params: Promise<{ id: string }>;
};

async function loadEvent(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;

  return getGatherEvent(id).catch((error) => {
    console.error('Failed to load gather event:', error);
    return null;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await loadEvent((await params).id);
  if (!event || !event.publishedAt) return {};

  return {
    title: `${event.title}｜集まる`,
    description: event.description.slice(0, 160),
    alternates: { canonical: `/gather/${event.id}` },
  };
}

// 経験談・Q&Aそれぞれの表示件数
const RELATED_LIMIT = 2;

// 同じ国の経験談。イベントと同じテーマのタグがついたものを先に、足りなければ同じ国の新着で補う
async function getRelatedExperiences(country: string, themeTagIds: number[]) {
  const sameCountry = and(eq(experiences.country, country), isNull(experiences.deletedAt));
  const columns = { id: experiences.id, title: experiences.title };

  const matched =
    themeTagIds.length === 0
      ? []
      : await db
          .select(columns)
          .from(experiences)
          .where(
            and(
              sameCountry,
              inArray(
                experiences.id,
                db
                  .select({ id: experienceTags.experienceId })
                  .from(experienceTags)
                  .where(inArray(experienceTags.tagId, themeTagIds))
              )
            )
          )
          .orderBy(desc(experiences.createdAt))
          .limit(RELATED_LIMIT);

  if (matched.length >= RELATED_LIMIT) return matched;

  const rest = await db
    .select(columns)
    .from(experiences)
    .where(
      matched.length === 0
        ? sameCountry
        : and(sameCountry, notInArray(experiences.id, matched.map((post) => post.id)))
    )
    .orderBy(desc(experiences.createdAt))
    .limit(RELATED_LIMIT - matched.length);

  return [...matched, ...rest];
}

// 同じ国のQ&A。選び方は経験談と同じ
async function getRelatedQuestions(country: string, themeTagIds: number[]) {
  const sameCountry = and(eq(questions.country, country), isNull(questions.deletedAt));
  const columns = { id: questions.id, title: questions.title };

  const matched =
    themeTagIds.length === 0
      ? []
      : await db
          .select(columns)
          .from(questions)
          .where(
            and(
              sameCountry,
              inArray(
                questions.id,
                db
                  .select({ id: questionTags.questionId })
                  .from(questionTags)
                  .where(inArray(questionTags.tagId, themeTagIds))
              )
            )
          )
          .orderBy(desc(questions.createdAt))
          .limit(RELATED_LIMIT);

  if (matched.length >= RELATED_LIMIT) return matched;

  const rest = await db
    .select(columns)
    .from(questions)
    .where(
      matched.length === 0
        ? sameCountry
        : and(sameCountry, notInArray(questions.id, matched.map((post) => post.id)))
    )
    .orderBy(desc(questions.createdAt))
    .limit(RELATED_LIMIT - matched.length);

  return [...matched, ...rest];
}

// イベントに行く前に読んでおける、同じ国の経験談・Q&A。
// イベントのテーマは、経験談・Q&Aのテーマタグと同じ名前にそろえてある（lib/gather/constants.ts）
async function getRelatedPosts(country: string, themes: string[]) {
  const themeTagIds =
    themes.length === 0
      ? []
      : (
          await db
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.category, 'theme'), inArray(tags.name, themes)))
        ).map((tag) => tag.id);

  const [relatedExperiences, relatedQuestions] = await Promise.all([
    getRelatedExperiences(country, themeTagIds),
    getRelatedQuestions(country, themeTagIds),
  ]);

  return [
    ...relatedExperiences.map((post) => ({ ...post, kind: 'experience' as const })),
    ...relatedQuestions.map((post) => ({ ...post, kind: 'question' as const })),
  ];
}

export default async function GatherEventPage({ params }: Props) {
  const event = await loadEvent((await params).id);
  if (!event) notFound();

  // 下書きは運営だけが確認できる
  if (!event.publishedAt) {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) notFound();
  }

  const relatedPosts = await getRelatedPosts(event.country, event.themes).catch((error) => {
    console.error('Failed to load related posts:', error);
    return [];
  });

  const { month, day, weekday } = dateParts(event.eventDate);
  const PlaceIcon = event.isOnline ? Video : MapPin;
  const sourceLabel =
    event.source === 'pick'
      ? 'Atlas運営が選んで掲載'
      : `${GATHER_SOURCES[0].label}を受け、運営が確認して掲載`;

  const infoRows = [
    {
      icon: Clock,
      label: '日時',
      value: `${formatEventDate(event.eventDate)}${event.startTime ? ` ${event.startTime}〜` : ''}`,
    },
    {
      icon: PlaceIcon,
      label: '場所',
      value: [gatherPlaceLabel(event), event.venue].filter(Boolean).join('　'),
    },
    event.audience && { icon: UsersRound, label: '対象', value: event.audience },
    event.fee && { icon: Ticket, label: '参加費', value: event.fee },
    { icon: MessageCircle, label: '言語', value: '日本語' },
  ].filter((row): row is Exclude<typeof row, null | '' | undefined> => Boolean(row));

  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 py-6 text-[#123B5D] md:px-6 md:py-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-4">
          <BackButton />
        </div>

        {!event.publishedAt && (
          <p className="mb-4 rounded-xl border border-[#F6DFA8] bg-[#FFF6E0] px-4 py-3 text-sm text-[#7A5B12]">
            下書きです。運営だけに表示されています。
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 space-y-6">
            <article className="rounded-2xl border border-[#E1EBF1] bg-white p-5 md:p-7">
              <div className="flex items-center gap-3.5">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-[#FFF3E8] py-2 leading-tight text-[#B4531A]">
                  <span className="text-[11px] font-semibold">{month}月</span>
                  <span className="my-0.5 text-[28px] font-extrabold tabular-nums">{day}</span>
                  <span className="text-[11px]">{weekday}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold tabular-nums text-[#B4531A]">
                    {formatEventDate(event.eventDate)}
                    {event.startTime && ` ${event.startTime}〜`}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#668096]">
                    <PlaceIcon className="h-3 w-3 shrink-0" />
                    {gatherPlaceLabel(event)}
                  </p>
                </div>
              </div>

              <h1 className="mt-4 text-[22px] font-extrabold leading-snug md:text-[26px]">
                {event.title}
              </h1>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#FFF3E8] px-2.5 py-0.5 text-xs text-[#B4531A]">
                  {event.format}
                </span>
                {event.isOnline && (
                  <span className="rounded-full bg-[#E8F6FC] px-2.5 py-0.5 text-xs text-[#1478B8]">
                    オンライン
                  </span>
                )}
                {event.themes.map((theme) => (
                  <span key={theme} className="rounded-full bg-[#F1F5F8] px-2.5 py-0.5 text-xs text-[#557086]">
                    {theme}
                  </span>
                ))}
              </div>

              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-[#2D4B63]">
                {event.description}
              </p>

              <dl className="mt-5 border-t border-[#EEF3F6]">
                {infoRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.label}
                      className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-[#EEF3F6] py-2.5 text-sm"
                    >
                      <dt className="flex items-center gap-1.5 text-xs text-[#668096]">
                        <Icon className="h-3.5 w-3.5" />
                        {row.label}
                      </dt>
                      <dd className="text-[#174C73]">{row.value}</dd>
                    </div>
                  );
                })}
              </dl>

              {event.applyUrl && (
                <a
                  href={event.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#1478B8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0D5686]"
                >
                  主催者のページで申し込む
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              <p className="mt-3 text-xs leading-5 text-[#8AA0B0]">
                申込と参加は、主催者の案内に従ってください。Atlasは掲載のみを行っています。
              </p>

              <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#F4F8FB] px-3 py-1.5 text-xs text-[#406783]">
                <BadgeCheck className="h-3.5 w-3.5 text-[#1F5F5B]" />
                {sourceLabel}　確認日 {new Date(event.updatedAt).toLocaleDateString('ja-JP')}
              </p>
            </article>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-4 w-4 text-[#1478B8]" />
                参加する前に読んでおきたい、{event.country}の経験談・Q&amp;A
              </h2>

              {relatedPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C9DDE9] bg-white px-4 py-6 text-center text-sm text-[#678096]">
                  {event.country}の経験談・Q&amp;Aは、まだありません。
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {relatedPosts.map((post) => (
                    <Link
                      key={`${post.kind}-${post.id}`}
                      href={post.kind === 'experience' ? `/experiences/${post.id}` : `/questions/${post.id}`}
                      className="rounded-xl border border-[#E1EBF1] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="inline-block rounded-full bg-[#E8F6FC] px-2.5 py-0.5 text-[11px] font-semibold text-[#1478B8]">
                        {post.kind === 'experience' ? '経験談' : 'Q&A'}
                      </span>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#174C73]">
                        {post.title}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-[#E1EBF1] bg-white p-4">
              <p className="text-xs font-bold text-[#668096]">主催</p>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F3] text-[#1F5F5B]">
                  <Building2 className="h-5 w-5" />
                </span>
                <p className="min-w-0 text-sm font-bold leading-6 text-[#174C73]">
                  {event.organizerName}
                </p>
              </div>
              {event.organizerUrl && (
                <a
                  href={event.organizerUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-[#D8E7F0] px-4 py-2 text-sm font-medium text-[#35617E] transition hover:bg-[#F1F8FC]"
                >
                  主催者のページを見る
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </section>

            <section className="rounded-2xl border border-[#E1EBF1] bg-white p-4 text-xs leading-6 text-[#4F6B80]">
              内容が古い、または誤りがある場合は、
              <Link href="/contact" className="font-semibold text-[#1478B8] hover:underline">
                お問い合わせ
              </Link>
              からお知らせください。
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
