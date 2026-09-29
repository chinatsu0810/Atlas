import 'server-only';

import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  answers,
  experiences,
  experienceTags,
  gatherEvents,
  giveaways,
  questions,
  questionTags,
  tags,
  users,
} from '@/lib/db/schema';
import { firstUpcomingDate } from '@/lib/gather/dates';
import { displayAuthorName } from '@/lib/users/display';
import {
  THEMES,
  countryNamesOf,
  matchesRegion,
  matchesTheme,
  type Place,
  type Region,
  type Theme,
  type ThemeKey,
} from './data';

export type PlacePost = {
  kind: 'experience' | 'question';
  id: number;
  title: string;
  content: string;
  tagNames: string[];
  author: string;
  createdAt: Date;
  answerCount: number;
};

export type PlaceGiveaway = { id: number; title: string; city: string };
export type PlaceEvent = { id: number; title: string; eventDate: string; place: string };

export type PlaceData = {
  place: Place;
  posts: PlacePost[];
  giveaways: (PlaceGiveaway & { text: string })[];
  events: (PlaceEvent & { text: string })[];
};

function orEmpty<T>(promise: Promise<T[]>) {
  return promise.catch((error) => {
    console.error('Failed to load place data:', error);
    return [] as T[];
  });
}

// その国の投稿をまとめて読み、地域・テーマの振り分けはこのあと画面側の関数で行う。
// 投稿には地域・テーマの項目が無く、本文から判定するため。
// 1か国の投稿がとても多くなったら、判定結果を保存する形に変える
export async function loadPlaceData(place: Place): Promise<PlaceData> {
  const names = countryNamesOf(place);
  const [experienceRows, questionRows, giveawayRows, eventRows] = await Promise.all([
    orEmpty(
      db
        .select({
          id: experiences.id,
          title: experiences.title,
          content: experiences.content,
          createdAt: experiences.createdAt,
          authorName: users.name,
          authorDeletedAt: users.deletedAt,
        })
        .from(experiences)
        .leftJoin(users, eq(experiences.authorId, users.id))
        .where(and(isNull(experiences.deletedAt), inArray(experiences.country, names)))
        .orderBy(desc(experiences.createdAt))
    ),
    orEmpty(
      db
        .select({
          id: questions.id,
          title: questions.title,
          content: questions.content,
          createdAt: questions.createdAt,
          authorName: users.name,
          authorDeletedAt: users.deletedAt,
        })
        .from(questions)
        .leftJoin(users, eq(questions.authorId, users.id))
        .where(and(isNull(questions.deletedAt), inArray(questions.country, names)))
        .orderBy(desc(questions.createdAt))
    ),
    orEmpty(
      db
        .select({
          id: giveaways.id,
          title: giveaways.title,
          description: giveaways.description,
          city: giveaways.city,
          area: giveaways.area,
        })
        .from(giveaways)
        .where(
          and(
            isNull(giveaways.deletedAt),
            inArray(giveaways.country, names),
            inArray(giveaways.status, ['open', 'reserved'])
          )
        )
        .orderBy(desc(giveaways.createdAt))
    ),
    orEmpty(
      db
        .select({
          id: gatherEvents.id,
          title: gatherEvents.title,
          description: gatherEvents.description,
          region: gatherEvents.region,
          eventDate: gatherEvents.eventDate,
          isOnline: gatherEvents.isOnline,
        })
        .from(gatherEvents)
        .where(
          and(
            isNull(gatherEvents.deletedAt),
            isNotNull(gatherEvents.publishedAt),
            inArray(gatherEvents.country, names),
            gte(gatherEvents.eventDate, firstUpcomingDate())
          )
        )
        .orderBy(asc(gatherEvents.eventDate))
    ),
  ]);

  const experienceIds = experienceRows.map((row) => row.id);
  const questionIds = questionRows.map((row) => row.id);

  const [experienceTagRows, questionTagRows, answerCounts] = await Promise.all([
    experienceIds.length === 0
      ? []
      : orEmpty(
          db
            .select({ postId: experienceTags.experienceId, name: tags.name })
            .from(experienceTags)
            .innerJoin(tags, eq(tags.id, experienceTags.tagId))
            .where(inArray(experienceTags.experienceId, experienceIds))
        ),
    questionIds.length === 0
      ? []
      : orEmpty(
          db
            .select({ postId: questionTags.questionId, name: tags.name })
            .from(questionTags)
            .innerJoin(tags, eq(tags.id, questionTags.tagId))
            .where(inArray(questionTags.questionId, questionIds))
        ),
    questionIds.length === 0
      ? []
      : orEmpty(
          db
            .select({ questionId: answers.questionId, n: count() })
            .from(answers)
            .where(and(isNull(answers.deletedAt), inArray(answers.questionId, questionIds)))
            .groupBy(answers.questionId)
        ),
  ]);

  const tagNamesOf = (rows: { postId: number; name: string }[], id: number) =>
    rows.filter((row) => row.postId === id && row.name !== 'その他').map((row) => row.name);

  const posts: PlacePost[] = [
    ...experienceRows.map((row) => ({
      kind: 'experience' as const,
      id: row.id,
      title: row.title,
      content: row.content,
      tagNames: tagNamesOf(experienceTagRows, row.id),
      author: displayAuthorName(row.authorName, row.authorDeletedAt),
      createdAt: row.createdAt,
      answerCount: 0,
    })),
    ...questionRows.map((row) => ({
      kind: 'question' as const,
      id: row.id,
      title: row.title,
      content: row.content,
      tagNames: tagNamesOf(questionTagRows, row.id),
      author: displayAuthorName(row.authorName, row.authorDeletedAt),
      createdAt: row.createdAt,
      answerCount: Number(answerCounts.find((item) => item.questionId === row.id)?.n ?? 0),
    })),
  ];

  return {
    place,
    posts,
    giveaways: giveawayRows.map((row) => ({
      id: row.id,
      title: row.title,
      city: row.city,
      text: [row.title, row.description, row.city, row.area].filter(Boolean).join(' '),
    })),
    events: eventRows.map((row) => ({
      id: row.id,
      title: row.title,
      eventDate: row.eventDate,
      place: row.isOnline ? 'オンライン' : [place.name, row.region].filter(Boolean).join('・'),
      text: [row.title, row.description, row.region].filter(Boolean).join(' '),
    })),
  };
}

const postText = (post: PlacePost) => `${post.title} ${post.content}`;

// 地域で絞る（国全体なら、そのまま全部）
export function inRegion(data: PlaceData, region: Region): PlaceData {
  return {
    place: data.place,
    posts: data.posts.filter((post) => matchesRegion(data.place, region, postText(post))),
    giveaways: data.giveaways.filter((item) => matchesRegion(data.place, region, item.text)),
    // オンラインのイベントは、どの地域からも参加できる
    events: data.events.filter(
      (item) => item.place === 'オンライン' || matchesRegion(data.place, region, item.text)
    ),
  };
}

// テーマで絞る。ひとつの投稿が、複数のテーマに入ることもある
export function inTheme(data: PlaceData, theme: Theme): PlaceData {
  return {
    place: data.place,
    posts: data.posts.filter((post) => matchesTheme(theme, postText(post), post.tagNames)),
    giveaways: data.giveaways.filter((item) => matchesTheme(theme, item.text, [])),
    events: data.events.filter((item) => matchesTheme(theme, item.text, [])),
  };
}

export function countByTheme(posts: PlacePost[]): Record<ThemeKey, number> {
  return Object.fromEntries(
    THEMES.map((theme) => [
      theme.key,
      posts.filter((post) => matchesTheme(theme, postText(post), post.tagNames)).length,
    ])
  ) as Record<ThemeKey, number>;
}
