// 自分のThreadsアカウントの直近の数字を集計し、分析担当（kpi-review）への入力を作る。
//
// 比較するのは「直近7日間に投稿した分」と「その前の7日間に投稿した分」の、現時点までの累計値。
// 前の7日間の投稿は、投稿からの経過日数が長い分、数字が大きく出やすい（分析担当にもその旨を伝える）。

import type { KpiReviewInput } from '@/lib/ai/skills/kpi-review';

import {
  getFollowersCount,
  getMediaInsights,
  listMyThreads,
  type MediaInsights,
  type ThreadsPost,
} from './client';
import { ThreadsNoDataError } from './errors';

const DAY_MS = 24 * 60 * 60 * 1000;
const INSIGHT_CONCURRENCY = 4;
// 分析担当に渡す、今週の投稿の一覧の最大件数（新しい順）
const MAX_LISTED_POSTS = 40;
const SNIPPET_LENGTH = 40;

type PostWithInsights = { post: ThreadsPost; insights: MediaInsights };

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

function total(list: PostWithInsights[], metric: keyof MediaInsights): number {
  return list.reduce((sum, item) => sum + item.insights[metric], 0);
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

function reactionCount(insights: MediaInsights): number {
  return insights.likes + insights.replies + insights.reposts + insights.quotes;
}

export async function buildWeeklyKpiInput(
  token: string,
  userId: string,
  now: Date = new Date()
): Promise<KpiReviewInput> {
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

  const row = (
    name: string,
    current: number,
    previous: number,
    unit = ''
  ): KpiReviewInput['metrics'][number] => ({
    name,
    value: `${formatNumber(current)}${unit}`,
    previousValue: `${formatNumber(previous)}${unit}`,
  });

  const metrics: KpiReviewInput['metrics'] = [
    row('投稿数', thisWeek.length, previousWeek.length, '件'),
    row('閲覧数（合計）', total(thisWeek, 'views'), total(previousWeek, 'views')),
    row(
      '1投稿あたりの閲覧数',
      average(total(thisWeek, 'views'), thisWeek.length),
      average(total(previousWeek, 'views'), previousWeek.length)
    ),
    row('いいね（合計）', total(thisWeek, 'likes'), total(previousWeek, 'likes')),
    row('返信（合計）', total(thisWeek, 'replies'), total(previousWeek, 'replies')),
    row('リポスト（合計）', total(thisWeek, 'reposts'), total(previousWeek, 'reposts')),
    row('引用（合計）', total(thisWeek, 'quotes'), total(previousWeek, 'quotes')),
    row('シェア（合計）', total(thisWeek, 'shares'), total(previousWeek, 'shares')),
  ];

  const followers = await getFollowersCount(token, userId);

  if (followers !== null) {
    metrics.push({ name: 'フォロワー数（現在）', value: formatNumber(followers) });
  }

  // 反応（いいね・返信・リポスト・引用）が1件以上あった投稿の数。
  // 一覧から数えさせず、こちらで数えて渡す（一覧の一部だけを見て、誤った件数を推測させないため）
  const reactedCount = (list: PostWithInsights[]) =>
    list.filter((item) => reactionCount(item.insights) > 0).length;

  const listedPosts = [...thisWeek]
    .sort((a, b) => b.post.timestamp.getTime() - a.post.timestamp.getTime())
    .slice(0, MAX_LISTED_POSTS)
    .map((item) => {
      const text = item.post.text.replace(/\s+/g, ' ');
      const snippet = `${text.slice(0, SNIPPET_LENGTH)}${text.length > SNIPPET_LENGTH ? '…' : ''}`;
      const { views, likes, replies, reposts, quotes } = item.insights;

      return `- ${formatPostedAt(item.post.timestamp)} 「${snippet}」（${text.length}字） 閲覧${formatNumber(views)} / いいね${likes} / 返信${replies} / リポスト${reposts} / 引用${quotes}`;
    });

  const context = [
    `対象は、運営のThreadsアカウントの投稿。「今週」は直近7日間（${formatDate(thisWeekStart)}〜${formatDate(now)}）に投稿した分、` +
      '「前回」はその前の7日間に投稿した分。数字はいずれも、投稿から現在までの累計値。',
    '前回分の投稿は、投稿からの経過日数が長い分、数字が大きく出やすい（単純な増減比較はできない）。',
    skippedCount > 0
      ? `数字（インサイト）を取得できなかった投稿が${skippedCount}件あり、集計から除外している。`
      : '',
    `反応（いいね・返信・リポスト・引用のいずれか）が1件以上あった投稿: 今週 ${reactedCount(thisWeek)}件（全${thisWeek.length}件中）、前回 ${reactedCount(previousWeek)}件（全${previousWeek.length}件中）。`,
    listedPosts.length > 0
      ? `今週の投稿の一覧（投稿日時は日本時間、新しい順。全${thisWeek.length}件${thisWeek.length > MAX_LISTED_POSTS ? `のうち新しい${MAX_LISTED_POSTS}件` : 'すべて'}）:\n${listedPosts.join('\n')}`
      : '',
    '前回の投稿の一覧は渡していない（件数と合計値のみ）。',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    period: `直近7日間（${formatDate(thisWeekStart)}〜${formatDate(now)}）`,
    metrics,
    context,
  };
}
