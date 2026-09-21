// KPIレビュー（分析担当の分析）の結果の保存・取得。
//
// 分析のたびに保存し、次回の分析で「前回の分析からの変化」を出すため、また、週次の投稿作成で
// テーマ選定の参考情報として使うため。権限チェックは呼び出し側（Server Action・ページ）が行う。

import { desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { threadsKpiReports, type ThreadsKpiReportRow } from '@/lib/db/schema';
import { kpiReviewSchema, type KpiReview, type KpiReviewInput } from '@/lib/ai/skills/kpi-review';

// ============================================================
// スナップショット（次回の比較に使う、分析時点の数字）
// ============================================================

export const postSnapshotSchema = z.object({
  id: z.string(),
  postedAt: z.string(), // ISO
  text: z.string(), // 先頭のみ（SNAPSHOT_TEXT_LENGTH字）
  length: z.number(),
  views: z.number(),
  likes: z.number(),
  replies: z.number(),
  reposts: z.number(),
  quotes: z.number(),
  shares: z.number(),
});

export type PostSnapshot = z.infer<typeof postSnapshotSchema>;

const totalsSchema = z.object({
  posts: z.number(),
  views: z.number(),
  likes: z.number(),
  replies: z.number(),
  reposts: z.number(),
  quotes: z.number(),
  shares: z.number(),
  reactedPosts: z.number(),
});

export type Totals = z.infer<typeof totalsSchema>;

export const weeklySnapshotSchema = z.object({
  capturedAt: z.string(), // ISO
  followers: z.number().nullable(),
  // 今週（直近7日間）の投稿すべて（数字を取得できたもの）
  thisWeek: z.array(postSnapshotSchema),
  // 前回（その前の7日間）の投稿は、合計のみ
  previousWeek: totalsSchema,
  thisWeekTotals: totalsSchema,
  skippedCount: z.number(),
});

export type WeeklySnapshot = z.infer<typeof weeklySnapshotSchema>;

export const SNAPSHOT_TEXT_LENGTH = 80;

const metricsSchema = z.array(
  z.object({
    name: z.string(),
    value: z.string(),
    previousValue: z.string().optional(),
  })
);

// ============================================================
// 保存済みの分析
// ============================================================

export type KpiReport = {
  id: number;
  createdAt: Date;
  periodStart: Date;
  periodEnd: Date;
  period: string; // 表示用
  metrics: KpiReviewInput['metrics'];
  context: string;
  snapshot: WeeklySnapshot;
  review: KpiReview;
};

// DBの生の行（jsonbはunknown）を、アプリ側で安全な型に検証・変換する。検証に失敗した行は null
function toKpiReport(row: ThreadsKpiReportRow): KpiReport | null {
  const metrics = metricsSchema.safeParse(row.metrics);
  const snapshot = weeklySnapshotSchema.safeParse(row.snapshot);
  const review = kpiReviewSchema.safeParse(row.review);

  if (!metrics.success || !snapshot.success || !review.success) return null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' });

  return {
    id: row.id,
    createdAt: row.createdAt,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    period: `直近7日間（${formatDate(row.periodStart)}〜${formatDate(row.periodEnd)}）`,
    metrics: metrics.data,
    context: row.context,
    snapshot: snapshot.data,
    review: review.data,
  };
}

// 画面に渡す形（Date は Server Action / Server Component の境界で扱いやすい文字列にする）
export type KpiReportView = {
  // 保存できなかった場合は null（分析の結果自体は表示する）
  id: number | null;
  createdAt: string; // ISO
  period: string;
  metrics: KpiReviewInput['metrics'];
  context: string;
  review: KpiReview;
};

export function toKpiReportView(report: KpiReport): KpiReportView {
  return {
    id: report.id,
    createdAt: report.createdAt.toISOString(),
    period: report.period,
    metrics: report.metrics,
    context: report.context,
    review: report.review,
  };
}

export async function saveKpiReport(params: {
  createdBy: number;
  periodStart: Date;
  periodEnd: Date;
  metrics: KpiReviewInput['metrics'];
  context: string;
  snapshot: WeeklySnapshot;
  review: KpiReview;
}): Promise<KpiReport> {
  const [row] = await db
    .insert(threadsKpiReports)
    .values({
      createdBy: params.createdBy,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      metrics: params.metrics,
      context: params.context,
      snapshot: params.snapshot,
      review: params.review,
    })
    .returning();

  const report = toKpiReport(row);

  if (!report) {
    throw new Error('保存した分析を読み込めませんでした。');
  }

  return report;
}

// 新しい順。検証に失敗した行は除く
export async function listKpiReports(limit = 10): Promise<KpiReport[]> {
  const rows = await db
    .select()
    .from(threadsKpiReports)
    .orderBy(desc(threadsKpiReports.createdAt))
    .limit(limit);

  return rows.map(toKpiReport).filter((report): report is KpiReport => report !== null);
}

export async function getLatestKpiReport(): Promise<KpiReport | null> {
  return (await listKpiReports(1))[0] ?? null;
}
