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
const TOP_POST_COUNT = 3;

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

  const topPosts = [...thisWeek]
    .sort((a, b) => reactionCount(b.insights) - reactionCount(a.insights))
    .slice(0, TOP_POST_COUNT)
    .filter((item) => reactionCount(item.insights) > 0)
    .map((item) => {
      const snippet = item.post.text.replace(/\s+/g, ' ').slice(0, 50);
      const { views, likes, replies, reposts } = item.insights;

      return `- 「${snippet}${item.post.text.length > 50 ? '…' : ''}」 閲覧${formatNumber(views)} / いいね${likes} / 返信${replies} / リポスト${reposts}`;
    });

  const context = [
    `対象は、運営のThreadsアカウントの投稿。「今週」は直近7日間（${formatDate(thisWeekStart)}〜${formatDate(now)}）に投稿した分、` +
      '「前回」はその前の7日間に投稿した分。数字はいずれも、投稿から現在までの累計値。',
    '前回分の投稿は、投稿からの経過日数が長い分、数字が大きく出やすい（単純な増減比較はできない）。',
    skippedCount > 0
      ? `数字（インサイト）を取得できなかった投稿が${skippedCount}件あり、集計から除外している。`
      : '',
    topPosts.length > 0 ? `今週の投稿のうち、反応（いいね・返信・リポスト・引用）が多かったもの:\n${topPosts.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    period: `直近7日間（${formatDate(thisWeekStart)}〜${formatDate(now)}）`,
    metrics,
    context,
  };
}
