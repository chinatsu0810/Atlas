// Workflow「国・地域別まとめ作成」（lib/ai/workflows/place-guide.ts）の記録役。
// 各段階の結果と、次の段階を place_guides に保存する。
// Workflowはこのインターフェースだけを知っており、DBの構造には依存しない。

import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { placeGuides } from '@/lib/db/schema';
import type { GuideRecorder } from '@/lib/ai/workflows/place-guide';

export function createGuideRecorder(guideId: number): GuideRecorder {
  const update = async (values: Partial<typeof placeGuides.$inferInsert>) => {
    await db
      .update(placeGuides)
      .set({ ...values, error: null, updatedAt: new Date() })
      .where(eq(placeGuides.id, guideId));
  };

  return {
    // 企画のあとは、会長の確認で止める
    savePlan: (plan) => update({ plan, status: 'plan_review' }),

    saveResearch: (research) => update({ research, status: 'checking' }),

    saveFactCheck: (factCheck) => update({ factCheck, status: 'writing' }),

    saveDraft: (draft) => update({ draft, status: 'reviewing' }),

    saveReview: async (review, next) => {
      await db
        .update(placeGuides)
        .set({
          review,
          status: next,
          error: null,
          updatedAt: new Date(),
          // 審査で差し戻して書き直す回数を数える（上限はWorkflow側）
          ...(next === 'writing' ? { reviewRounds: sql`${placeGuides.reviewRounds} + 1` } : {}),
        })
        .where(eq(placeGuides.id, guideId));
    },
  };
}
