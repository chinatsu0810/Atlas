'use server';

// 国・地域別まとめの、運営画面（/ai/guides）から呼ぶ操作。
// このファイルの役割は、認証・入力検証・DBの読み書き・会長の操作（差し戻し・手直し・公開）と、
// Workflow（lib/ai/workflows/place-guide.ts）の呼び出しだけ。AI社員の順番はWorkflow側で決めている。

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { placeGuides } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { SkillCallError } from '@/lib/ai/core/skill';
import { estimateCostUsd, sumUsage, type SkillUsage } from '@/lib/ai/core/usage';
import { UNEXPECTED_ERROR_MESSAGE, type ActionResult } from '@/lib/action-result';
import { GuideStepError, runGuideStep } from '@/lib/ai/workflows/place-guide';
import { findPlace, findRegion, findTheme, regionLabel } from '@/lib/places/data';
import { inRegion, inTheme, loadPlaceData } from '@/lib/places/queries';

import { createGuideRecorder } from './recorder';
import { RUNNING_TIMEOUT_MS, getPlaceGuide, type PlaceGuide } from './queries';
import {
  AUTO_STEPS,
  GUIDE_BUDGET_ERROR,
  TOKEN_BUDGET_PER_GUIDE,
  guideContentSchema,
  guidePlanSchema,
  usedTokens,
  type GuideContent,
  type GuideItem,
  type GuideTarget,
  type GuideUsageEntry,
} from './types';

class GuideActionError extends Error {}

async function requireAdmin() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    throw new GuideActionError('この操作は運営のみ実行できます。');
  }
  return user;
}

// 画面に理由を出せるよう、想定内の失敗は文言を返し、想定外の失敗は定型文にする
async function toResult<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (
      error instanceof GuideActionError ||
      error instanceof GuideStepError ||
      error instanceof SkillCallError
    ) {
      return { ok: false, error: error.message };
    }
    console.error('place guide action failed:', error);
    return { ok: false, error: UNEXPECTED_ERROR_MESSAGE };
  }
}

async function requireGuide(id: number): Promise<PlaceGuide> {
  const guide = await getPlaceGuide(id);
  if (!guide) throw new GuideActionError('まとめが見つかりません。');
  return guide;
}

function resolveTarget(countrySlug: string, regionSlug: string, themeKey: string) {
  const place = findPlace(countrySlug);
  const region = place && findRegion(place, regionSlug);
  const theme = findTheme(themeKey);
  if (!place || !region || !theme) {
    throw new GuideActionError('国・地域・テーマの指定が正しくありません。');
  }
  return { place, region, theme };
}

async function buildTarget(guide: PlaceGuide): Promise<GuideTarget> {
  const { place, region, theme } = resolveTarget(guide.countrySlug, guide.regionSlug, guide.themeKey);
  const data = inTheme(inRegion(await loadPlaceData(place), region), theme);
  return {
    countryName: place.name,
    regionName: place.regions.length === 0 ? place.name : regionLabel(place, region),
    themeLabel: theme.label,
    themeHint: theme.hint,
    atlasPostTitles: data.posts.slice(0, 30).map((post) => post.title),
  };
}

function revalidateGuide(guide: Pick<PlaceGuide, 'id' | 'countrySlug' | 'regionSlug' | 'themeKey'>) {
  revalidatePath('/ai/guides');
  revalidatePath(`/ai/guides/${guide.id}`);
  revalidatePath(`/places/${guide.countrySlug}/${guide.regionSlug}/${guide.themeKey}`);
}

export async function createPlaceGuide(input: {
  countrySlug: string;
  regionSlug: string;
  themeKey: string;
  note?: string;
}): Promise<ActionResult<{ id: number }>> {
  return toResult(async () => {
    const user = await requireAdmin();
    resolveTarget(input.countrySlug, input.regionSlug, input.themeKey);
    const note = input.note?.trim().slice(0, 2000) || null;

    const [created] = await db
      .insert(placeGuides)
      .values({
        countrySlug: input.countrySlug,
        regionSlug: input.regionSlug,
        themeKey: input.themeKey,
        chairmanNote: note,
        createdBy: user.id,
      })
      .returning({ id: placeGuides.id });

    revalidatePath('/ai/guides');
    return { id: created.id };
  });
}

/**
 * いまの段階の作業を1つだけ進める。画面は、会長の確認待ちになるまでこれを繰り返し呼ぶ。
 * 同じまとめを同時に2回動かさないよう、実行中の印（runningSince）を立ててから動かす。
 * 使ったトークンが予算（TOKEN_BUDGET_PER_GUIDE）を超えていたら、会長が allowOverBudget を付けて
 * 呼ぶまで進めない（予算を超えたあとは、1段階ごとに会長の操作が要る）。
 */
export async function advancePlaceGuide(
  id: number,
  options: { allowOverBudget?: boolean } = {}
): Promise<ActionResult<PlaceGuide>> {
  return toResult(async () => {
    await requireAdmin();

    const before = await requireGuide(id);
    if (
      AUTO_STEPS.includes(before.status) &&
      !before.running &&
      !options.allowOverBudget &&
      usedTokens(before.usage) >= TOKEN_BUDGET_PER_GUIDE
    ) {
      if (before.error !== GUIDE_BUDGET_ERROR) {
        await db
          .update(placeGuides)
          .set({ error: GUIDE_BUDGET_ERROR, updatedAt: new Date() })
          .where(eq(placeGuides.id, id));
      }
      return requireGuide(id);
    }

    const staleBefore = new Date(Date.now() - RUNNING_TIMEOUT_MS);
    const [locked] = await db
      .update(placeGuides)
      .set({ runningSince: new Date() })
      .where(
        and(
          eq(placeGuides.id, id),
          isNull(placeGuides.deletedAt),
          inArray(placeGuides.status, AUTO_STEPS),
          or(isNull(placeGuides.runningSince), lt(placeGuides.runningSince, staleBefore))
        )
      )
      .returning({ id: placeGuides.id });

    const guide = await requireGuide(id);
    if (!locked) return guide;

    // この段階でAIを呼んだ分の使用量。失敗しても、呼んだ分は記録する
    const usages: SkillUsage[] = [];

    try {
      await runGuideStep(
        {
          status: guide.status,
          target: await buildTarget(guide),
          chairmanNote: guide.chairmanNote,
          chairmanFeedback: guide.chairmanFeedback,
          plan: guide.plan,
          research: guide.research,
          factCheck: guide.factCheck,
          draft: guide.draft,
          review: guide.review,
          reviewRounds: guide.reviewRounds,
        },
        createGuideRecorder(id),
        { onUsage: (usage) => usages.push(usage) }
      );
    } catch (error) {
      const message =
        error instanceof GuideStepError || error instanceof SkillCallError || error instanceof GuideActionError
          ? error.message
          : UNEXPECTED_ERROR_MESSAGE;
      if (message === UNEXPECTED_ERROR_MESSAGE) console.error('place guide step failed:', error);
      await db.update(placeGuides).set({ error: message, updatedAt: new Date() }).where(eq(placeGuides.id, id));
    } finally {
      const entry: GuideUsageEntry | null =
        usages.length === 0
          ? null
          : {
              step: guide.status,
              at: new Date().toISOString(),
              calls: usages.length,
              ...sumUsage(usages),
              costUsd: usages.reduce((total, usage) => total + estimateCostUsd(usage), 0),
            };
      await db
        .update(placeGuides)
        .set({
          runningSince: null,
          ...(entry ? { usage: sql`${placeGuides.usage} || ${JSON.stringify([entry])}::text::jsonb` } : {}),
        })
        .where(eq(placeGuides.id, id));
    }

    const updated = await requireGuide(id);
    revalidateGuide(updated);
    return updated;
  });
}

/**
 * 会長の差し戻し。どの段階からやり直すかを選ぶ。
 * 執筆からやり直すときは、コメントをライターに渡す。
 */
export async function restartPlaceGuide(
  id: number,
  from: 'planning' | 'researching' | 'writing',
  feedback?: string
): Promise<ActionResult<PlaceGuide>> {
  return toResult(async () => {
    await requireAdmin();
    const guide = await requireGuide(id);
    if (guide.running) throw new GuideActionError('いまAI社員が作業中です。終わってから操作してください。');

    await db
      .update(placeGuides)
      .set({
        status: from,
        error: null,
        review: null,
        reviewRounds: 0,
        chairmanFeedback: feedback?.trim().slice(0, 2000) || null,
        updatedAt: new Date(),
      })
      .where(eq(placeGuides.id, id));

    const updated = await requireGuide(id);
    revalidateGuide(updated);
    return updated;
  });
}

/**
 * 会長が企画を確認・手直しして、調査を始める。
 * ここで保存した企画のとおりに、調査・執筆が進む。
 */
export async function approvePlaceGuidePlan(id: number, rawPlan: unknown): Promise<ActionResult<PlaceGuide>> {
  return toResult(async () => {
    await requireAdmin();
    const guide = await requireGuide(id);
    if (guide.status !== 'plan_review') {
      throw new GuideActionError('調査を始められるのは、企画の確認待ちのまとめだけです。');
    }

    const parsed = guidePlanSchema.safeParse(normalizePlan(rawPlan));
    if (!parsed.success) {
      throw new GuideActionError(
        '企画の形が正しくありません。比べるカードは選択肢を2つ以上・項目を1つ以上、見出しは名前を入れてください。'
      );
    }
    if (!parsed.data.comparison && parsed.data.topics.length === 0) {
      throw new GuideActionError('比べるカードか、テーマ別の情報の見出しを、1つ以上入れてください。');
    }

    await db
      .update(placeGuides)
      .set({
        plan: parsed.data,
        status: 'researching',
        error: null,
        // 企画への差し戻しコメントは、執筆に持ち越さない
        chairmanFeedback: null,
        updatedAt: new Date(),
      })
      .where(eq(placeGuides.id, id));

    const updated = await requireGuide(id);
    revalidateGuide(updated);
    return updated;
  });
}

// 画面で編集した企画の、空の入力を取り除く
function normalizePlan(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const plan = raw as {
    comparison?: { title?: string; options?: string[]; attributes?: string[] } | null;
    topics?: { key?: string; heading?: string; questions?: string[] }[];
  };
  const clean = (list: string[] | undefined) => (list ?? []).map((item) => item.trim()).filter(Boolean);

  return {
    comparison: plan.comparison
      ? {
          title: plan.comparison.title?.trim() ?? '',
          options: clean(plan.comparison.options),
          attributes: clean(plan.comparison.attributes),
        }
      : null,
    topics: (plan.topics ?? [])
      .map((topic, index) => ({
        key: topic.key?.trim() || `topic-${index + 1}`,
        heading: topic.heading?.trim() ?? '',
        questions: clean(topic.questions),
      }))
      .filter((topic) => topic.heading),
  };
}

// 会長の手直しを、下書きに保存する（公開中の中身は、公開し直すまで変わらない）
export async function savePlaceGuideDraft(id: number, rawContent: unknown): Promise<ActionResult<PlaceGuide>> {
  return toResult(async () => {
    await requireAdmin();
    const guide = await requireGuide(id);
    if (guide.status !== 'pending_review' && guide.status !== 'published') {
      throw new GuideActionError('手直しできるのは、本文の確認待ち・公開中のまとめだけです。');
    }

    const parsed = guideContentSchema.safeParse(rawContent);
    if (!parsed.success) throw new GuideActionError('内容の形式が正しくありません。');

    // 出典の無い項目は保存しない（どの項目にも、根拠のページが必要）。
    // 比べるカードの項目は、空欄（分からない）のままでよい
    const keepItems = (items: GuideItem[]) =>
      items
        .map((item) => ({ text: item.text.trim(), sourceIds: item.sourceIds }))
        .filter((item) => item.text && item.sourceIds.length > 0);
    const data = parsed.data;
    const comparison = data.comparison
      ? {
          ...data.comparison,
          title: data.comparison.title.trim(),
          options: data.comparison.options
            .map((option) => ({
              ...option,
              name: option.name.trim(),
              cells: data.comparison!.attributes.map((_, index) => {
                const cell = option.cells[index];
                return cell && cell.text.trim() && cell.sourceIds.length > 0
                  ? { text: cell.text.trim(), sourceIds: cell.sourceIds }
                  : { text: '', sourceIds: [] };
              }),
            }))
            .filter((option) => option.name),
        }
      : null;

    const content: GuideContent = {
      ...data,
      lead: data.lead.trim(),
      highlights: keepItems(data.highlights),
      comparison: comparison && comparison.options.length >= 2 ? comparison : null,
      topics: data.topics
        .map((topic) => ({ heading: topic.heading.trim(), items: keepItems(topic.items) }))
        .filter((topic) => topic.heading && topic.items.length > 0),
    };

    await db.update(placeGuides).set({ draft: content, updatedAt: new Date() }).where(eq(placeGuides.id, id));

    const updated = await requireGuide(id);
    revalidateGuide(updated);
    return updated;
  });
}

export async function publishPlaceGuide(id: number): Promise<ActionResult<PlaceGuide>> {
  return toResult(async () => {
    const user = await requireAdmin();
    const guide = await requireGuide(id);
    if (guide.status !== 'pending_review' && guide.status !== 'published') {
      throw new GuideActionError('公開できるのは、本文の確認待ちのまとめだけです。');
    }
    const draft = guide.draft;
    if (!draft || (draft.highlights.length === 0 && !draft.comparison && draft.topics.length === 0)) {
      throw new GuideActionError('公開する中身がありません。');
    }

    await db
      .update(placeGuides)
      .set({
        status: 'published',
        publishedContent: guide.draft,
        publishedAt: new Date(),
        publishedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(placeGuides.id, id));

    const updated = await requireGuide(id);
    revalidateGuide(updated);
    return updated;
  });
}

export async function unpublishPlaceGuide(id: number): Promise<ActionResult<PlaceGuide>> {
  return toResult(async () => {
    await requireAdmin();
    await requireGuide(id);

    await db
      .update(placeGuides)
      .set({ status: 'pending_review', publishedContent: null, publishedAt: null, updatedAt: new Date() })
      .where(eq(placeGuides.id, id));

    const updated = await requireGuide(id);
    revalidateGuide(updated);
    return updated;
  });
}

export async function deletePlaceGuide(id: number): Promise<ActionResult<null>> {
  return toResult(async () => {
    await requireAdmin();
    const guide = await requireGuide(id);

    await db.update(placeGuides).set({ deletedAt: new Date() }).where(eq(placeGuides.id, id));

    revalidateGuide(guide);
    return null;
  });
}
