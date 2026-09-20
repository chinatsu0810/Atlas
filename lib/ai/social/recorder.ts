// Workflow「Threads投稿作成」（lib/ai/workflows/social-post-pipeline.ts）の記録役。
// 進行の経過（結果・状態）を social_workflows に保存する。
// Workflowはこのインターフェースだけを知っており、DBの構造には依存しない。

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { socialWorkflows } from '@/lib/db/schema';
import type { SocialPostRecorder } from '@/lib/ai/workflows/social-post-pipeline';

export function createSocialPostRecorder(workflowId: number): SocialPostRecorder {
  const update = async (values: Partial<typeof socialWorkflows.$inferInsert>) => {
    await db
      .update(socialWorkflows)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(socialWorkflows.id, workflowId));
  };

  return {
    saveResearch: (researchResult) =>
      update({ researchResult, status: 'planning' }),

    savePlan: (postPlan) => update({ postPlan }),

    startWriting: () => update({ status: 'writing' }),

    saveDraft: (draft) =>
      update({
        draft: draft.draft,
        hashtags: draft.hashtags,
        status: 'auditing',
      }),

    saveAudit: (auditResult) =>
      update({
        auditResult,
        status:
          auditResult.auditStatus === 'pass' ? 'pending_review' : 'needs_revision',
      }),
  };
}
