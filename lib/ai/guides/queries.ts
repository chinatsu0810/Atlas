import 'server-only';

import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { placeGuides, type PlaceGuideRow } from '@/lib/db/schema';
import {
  GUIDE_STATUSES,
  factCheckOutputSchema,
  guideContentSchema,
  guidePlanSchema,
  reviewOutputSchema,
  type FactCheckOutput,
  type GuideContent,
  type GuidePlan,
  type GuideResearch,
  type GuideStatus,
  type GuideUsageEntry,
  type ReviewOutput,
} from './types';

export type PlaceGuide = {
  id: number;
  countrySlug: string;
  regionSlug: string;
  themeKey: string;
  status: GuideStatus;
  running: boolean;
  error: string | null;
  plan: GuidePlan | null;
  research: GuideResearch | null;
  factCheck: FactCheckOutput | null;
  draft: GuideContent | null;
  review: ReviewOutput | null;
  reviewRounds: number;
  chairmanNote: string | null;
  chairmanFeedback: string | null;
  publishedContent: GuideContent | null;
  publishedAt: Date | null;
  usage: GuideUsageEntry[];
  createdAt: Date;
  updatedAt: Date;
};

// 実行中とみなす時間。これを過ぎても runningSince が残っていたら、止まったとみなしてやり直せる
export const RUNNING_TIMEOUT_MS = 10 * 60 * 1000;

function parseOrNull<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }, value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = schema.safeParse(value);
  return parsed.success ? (parsed.data as T) : null;
}

// 調査結果は Workflow が組み立てて保存したものなので、形だけ確かめる
function parseResearch(value: unknown): GuideResearch | null {
  if (!value || typeof value !== 'object') return null;
  const research = value as GuideResearch;
  return Array.isArray(research.facts) && Array.isArray(research.sources) ? research : null;
}

export function toPlaceGuide(row: PlaceGuideRow): PlaceGuide {
  const status = GUIDE_STATUSES.includes(row.status as GuideStatus)
    ? (row.status as GuideStatus)
    : 'planning';

  return {
    id: row.id,
    countrySlug: row.countrySlug,
    regionSlug: row.regionSlug,
    themeKey: row.themeKey,
    status,
    running:
      row.runningSince !== null && Date.now() - row.runningSince.getTime() < RUNNING_TIMEOUT_MS,
    error: row.error,
    plan: parseOrNull<GuidePlan>(guidePlanSchema, row.plan),
    research: parseResearch(row.research),
    factCheck: parseOrNull<FactCheckOutput>(factCheckOutputSchema, row.factCheck),
    draft: parseOrNull<GuideContent>(guideContentSchema, row.draft),
    review: parseOrNull<ReviewOutput>(reviewOutputSchema, row.review),
    reviewRounds: row.reviewRounds,
    chairmanNote: row.chairmanNote,
    chairmanFeedback: row.chairmanFeedback,
    publishedContent: parseOrNull<GuideContent>(guideContentSchema, row.publishedContent),
    publishedAt: row.publishedAt,
    usage: Array.isArray(row.usage) ? (row.usage as GuideUsageEntry[]) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPlaceGuides(): Promise<PlaceGuide[]> {
  const rows = await db
    .select()
    .from(placeGuides)
    .where(isNull(placeGuides.deletedAt))
    .orderBy(desc(placeGuides.updatedAt))
    .limit(100);
  return rows.map(toPlaceGuide);
}

export async function getPlaceGuide(id: number): Promise<PlaceGuide | null> {
  const [row] = await db
    .select()
    .from(placeGuides)
    .where(and(eq(placeGuides.id, id), isNull(placeGuides.deletedAt)))
    .limit(1);
  return row ? toPlaceGuide(row) : null;
}

export type PublishedGuide = { content: GuideContent; publishedAt: Date };

// ページに出す、公開中のまとめ（同じ対象に複数あるときは、いちばん新しく公開したもの）。
// テーブルがまだ無い環境（マイグレーション前）でも、ページは「まとめ無し」として表示する
export async function getPublishedGuide(
  countrySlug: string,
  regionSlug: string,
  themeKey: string
): Promise<PublishedGuide | null> {
  try {
    const [row] = await db
      .select({ content: placeGuides.publishedContent, publishedAt: placeGuides.publishedAt })
      .from(placeGuides)
      .where(
        and(
          eq(placeGuides.countrySlug, countrySlug),
          eq(placeGuides.regionSlug, regionSlug),
          eq(placeGuides.themeKey, themeKey),
          isNull(placeGuides.deletedAt),
          isNotNull(placeGuides.publishedAt)
        )
      )
      .orderBy(desc(placeGuides.publishedAt))
      .limit(1);

    const content = row ? parseOrNull<GuideContent>(guideContentSchema, row.content) : null;
    return content && row?.publishedAt ? { content, publishedAt: row.publishedAt } : null;
  } catch (error) {
    console.error('Failed to load published place guide:', error);
    return null;
  }
}
