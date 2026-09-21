// 自分のThreadsアカウントの直近の数字を集計し、分析担当（kpi-review）への入力と、
// 次回の比較に使うスナップショットを作る。
//
// 比較するのは「直近7日間に投稿した分」と「その前の7日間に投稿した分」の、現時点までの累計値。
// 前の7日間の投稿は、投稿からの経過日数が長い分、数字が大きく出やすい（分析担当にもその旨を伝える）。
// 前回の分析が保存されていれば、「前回の分析からの変化」（フォロワー数の増減、同じ投稿の数字の増加）も渡す。

import type { KpiReviewInput } from '@/lib/ai/skills/kpi-review';

import {
  getFollowersCount,
  getMediaInsights,
  listMyThreads,
  type MediaInsights,
  type ThreadsPost,
} from './client';
import { ThreadsNoDataError } from './errors';
import { SNAPSHOT_TEXT_LENGTH, type PostSnapshot, type Totals, type WeeklySnapshot } from './reports';

const DAY_MS = 24 * 60 * 60 * 1000;
const INSIGHT_CONCURRENCY = 4;
// 分析担当に渡す、今週の投稿の一覧の最大件数（新しい順）
const MAX_LISTED_POSTS = 40;
const SNIPPET_LENGTH = 40;

type PostWithInsights = { post: ThreadsPost; insights: MediaInsights };

// 前回の分析（保存済み）。比較に必要な部分のみ
export type PreviousAnalysis = { createdAt: Date; snapshot: WeeklySnapshot };

export type WeeklyKpiData = {
  input: KpiReviewInput;
  snapshot: WeeklySnapshot;
  periodStart: Date;
  periodEnd: Date;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);

  return results;
}

function reactionCount(insights: MediaInsights): number {
  return insights.likes + insights.replies + insights.reposts + insights.quotes;
}

function totalsOf(list: PostWithInsights[]): Totals {
  const sum = (metric: keyof MediaInsights) =>
    list.reduce((acc, item) => acc + item.insights[metric], 0);

  return {
    posts: list.length,
    views: sum('views'),
    likes: sum('likes'),
    replies: sum('replies'),
    reposts: sum('reposts'),
    quotes: sum('quotes'),
    shares: sum('shares'),
    reactedPosts: list.filter((item) => reactionCount(item.insights) > 0).length,
  };
}

function average(value: number, count: number): number {
  return count === 0 ? 0 : Math.round(value / count);
}

const formatNumber = (value: number) => value.toLocaleString('ja-JP');

const formatDate = (date: Date) =>
  date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' });

// 投稿日時（日本時間）。時間帯・曜日ごとの傾向を見られるようにする
const formatPostedAt = (date: Date) =>
  date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  });

const signed = (value: number) => `${value >= 0 ? '+' : ''}${formatNumber(value)}`;

function toPostSnapshot(item: PostWithInsights): PostSnapshot {
  const text = item.post.text.replace(/\s+/g, ' ');

  return {
    id: item.post.id,
    postedAt: item.post.timestamp.toISOString(),
    text: text.slice(0, SNAPSHOT_TEXT_LENGTH),
    length: text.length,
    ...item.insights,
  };
}

/**
 * 前回の分析からの変化を、分析担当に渡す文章（行の配列）にする。
 * - フォロワー数の増減
 * - 前回の分析に含まれていた投稿のうち、今回も数字を取得できたものの、累計値の増加
 *   （投稿からの経過日数をそろえた比較になる）
 * - 前回の分析以降に投稿された数
 */
export function describeChangeSinceLast(
  previous: PreviousAnalysis,
  current: { posts: PostSnapshot[]; followers: number | null }
): string[] {
  const lines: string[] = [];

  const previousFollowers = previous.snapshot.followers;

  if (previousFollowers !== null && current.followers !== null) {
    lines.push(
      `- フォロワー数: ${formatNumber(previousFollowers)} → ${formatNumber(current.followers)}（${signed(current.followers - previousFollowers)}）`
    );
  }

  const currentById = new Map(current.posts.map((post) => [post.id, post]));
  const matched = previous.snapshot.thisWeek
    .map((before) => ({ before, after: currentById.get(before.id) }))
    .filter((pair): pair is { before: PostSnapshot; after: PostSnapshot } => pair.after !== undefined);

  if (matched.length > 0) {
    const delta = (key: 'views' | 'likes' | 'replies' | 'reposts') => {
      const before = matched.reduce((sum, pair) => sum + pair.before[key], 0);
      const after = matched.reduce((sum, pair) => sum + pair.after[key], 0);

      return `${formatNumber(before)} → ${formatNumber(after)}（${signed(after - before)}）`;
    };

    lines.push(
      `- 前回の分析に含まれていた投稿のうち、今回も数字を取得できた${matched.length}件の累計（同じ投稿の、前回の分析時点からの増加）: ` +
        `閲覧 ${delta('views')} / いいね ${delta('likes')} / 返信 ${delta('replies')} / リポスト ${delta('reposts')}`
    );
  } else if (previous.snapshot.thisWeek.length > 0) {
    lines.push(
      `- 前回の分析に含まれていた投稿（${previous.snapshot.thisWeek.length}件）は、今回の取得範囲（直近14日間）に含まれないため、同じ投稿の変化は比べられない。`
    );
  }

  const newPosts = current.posts.filter(
    (post) => new Date(post.postedAt).getTime() > previous.createdAt.getTime()
  ).length;

  lines.push(`- 前回の分析以降に投稿された分: ${newPosts}件`);

  return lines.length > 0
    ? [`前回の分析（${formatPostedAt(previous.createdAt)}）からの変化:`, ...lines]
    : [];
}

export async function buildWeeklyKpiInput(
  token: string,
  userId: string,
  options: { previous?: PreviousAnalysis | null; now?: Date } = {}
): Promise<WeeklyKpiData> {
  const now = options.now ?? new Date();
  const previous = options.previous ?? null;

  const thisWeekStart = new Date(now.getTime() - 7 * DAY_MS);
  const previousWeekStart = new Date(now.getTime() - 14 * DAY_MS);

  // リポスト（REPOST_FACADE）は他の人の投稿で、数字を取得できないため対象外
  const posts = (await listMyThreads(token, { since: previousWeekStart, until: now })).filter(
    (post) => post.mediaType !== 'REPOST_FACADE'
  );

  if (posts.length === 0) {
    throw new ThreadsNoDataError('直近14日間に、分析できる自分の投稿がありません。');
  }

  const fetched = await mapWithConcurrency(posts, INSIGHT_CONCURRENCY, async (post) => {
    try {
      return { post, insights: await getMediaInsights(token, post.id) };
    } catch {
      return { post, insights: null };
    }
  });

  const withInsights = fetched.filter(
    (item): item is PostWithInsights => item.insights !== null
  );
  const skippedCount = fetched.length - withInsights.length;

  if (withInsights.length === 0) {
    throw new ThreadsNoDataError(
      '投稿は見つかりましたが、数字（インサイト）を取得できませんでした。権限（threads_manage_insights）を確認してください。'
    );
  }

  const thisWeek = withInsights.filter((item) => item.post.timestamp >= thisWeekStart);
  const previousWeek = withInsights.filter((item) => item.post.timestamp < thisWeekStart);

  const thisTotals = totalsOf(thisWeek);
  const previousTotals = totalsOf(previousWeek);

  const row = (
    name: string,
    current: number,
    before: number,
    unit = ''
  ): KpiReviewInput['metrics'][number] => ({
    name,
    value: `${formatNumber(current)}${unit}`,
    previousValue: `${formatNumber(before)}${unit}`,
  });

  const metrics: KpiReviewInput['metrics'] = [
    row('投稿数', thisTotals.posts, previousTotals.posts, '件'),
    row('閲覧数（合計）', thisTotals.views, previousTotals.views),
    row(
      '1投稿あたりの閲覧数',
      average(thisTotals.views, thisTotals.posts),
      average(previousTotals.views, previousTotals.posts)
    ),
    row('いいね（合計）', thisTotals.likes, previousTotals.likes),
    row('返信（合計）', thisTotals.replies, previousTotals.replies),
    row('リポスト（合計）', thisTotals.reposts, previousTotals.reposts),
    row('引用（合計）', thisTotals.quotes, previousTotals.quotes),
    row('シェア（合計）', thisTotals.shares, previousTotals.shares),
  ];

  const followers = await getFollowersCount(token, userId);

  if (followers !== null) {
    const previousFollowers = previous?.snapshot.followers ?? null;

    metrics.push(
      previousFollowers !== null
        ? {
            name: 'フォロワー数（現在／前回は前回の分析時）',
            value: formatNumber(followers),
            previousValue: formatNumber(previousFollowers),
          }
        : { name: 'フォロワー数（現在）', value: formatNumber(followers) }
    );
  }

  const snapshot: WeeklySnapshot = {
    capturedAt: now.toISOString(),
    followers,
    thisWeek: thisWeek.map(toPostSnapshot),
    thisWeekTotals: thisTotals,
    previousWeek: previousTotals,
    skippedCount,
  };

  const listedPosts = [...thisWeek]
    .sort((a, b) => b.post.timestamp.getTime() - a.post.timestamp.getTime())
    .slice(0, MAX_LISTED_POSTS)
    .map((item) => {
      const text = item.post.text.replace(/\s+/g, ' ');
      const snippet = `${text.slice(0, SNIPPET_LENGTH)}${text.length > SNIPPET_LENGTH ? '…' : ''}`;
      const { views, likes, replies, reposts, quotes } = item.insights;

      return `- ${formatPostedAt(item.post.timestamp)} 「${snippet}」（${text.length}字） 閲覧${formatNumber(views)} / いいね${likes} / 返信${replies} / リポスト${reposts} / 引用${quotes}`;
    });

  const changeLines = previous
    ? describeChangeSinceLast(previous, {
        posts: withInsights.map(toPostSnapshot),
        followers,
      })
    : [];

  const context = [
    `対象は、運営のThreadsアカウントの投稿。「今週」は直近7日間（${formatDate(thisWeekStart)}〜${formatDate(now)}）に投稿した分、` +
      '「前回」はその前の7日間に投稿した分。数字はいずれも、投稿から現在までの累計値。',
    '前回分の投稿は、投稿からの経過日数が長い分、数字が大きく出やすい（単純な増減比較はできない）。',
    skippedCount > 0
      ? `数字（インサイト）を取得できなかった投稿が${skippedCount}件あり、集計から除外している。`
      : '',
    `反応（いいね・返信・リポスト・引用のいずれか）が1件以上あった投稿: 今週 ${thisTotals.reactedPosts}件（全${thisTotals.posts}件中）、前回 ${previousTotals.reactedPosts}件（全${previousTotals.posts}件中）。`,
    listedPosts.length > 0
      ? `今週の投稿の一覧（投稿日時は日本時間、新しい順。全${thisTotals.posts}件${thisTotals.posts > MAX_LISTED_POSTS ? `のうち新しい${MAX_LISTED_POSTS}件` : 'すべて'}）:\n${listedPosts.join('\n')}`
      : '',
    '前回の投稿の一覧は渡していない（件数と合計値のみ）。',
    changeLines.length > 0
      ? changeLines.join('\n')
      : '前回の分析は保存されていないため、前回の分析からの変化は比べられない（今回の分析が、次回の比較の基準になる）。',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    input: {
      period: `直近7日間（${formatDate(thisWeekStart)}〜${formatDate(now)}）`,
      metrics,
      context,
    },
    snapshot,
    periodStart: thisWeekStart,
    periodEnd: now,
  };
}
