// Workflow「KPIレビュー」：分析担当が、与えられた数字を分析する。
//
// 数字の入手（Threads APIなど）は、このWorkflowの外（lib/threads）が担う。
// 分析担当は、数字から言えることと言えないことを整理し、改善の材料を出すだけで、
// 「次はこうすべき」という決定はしない（判断は会長・運営が行う）。

import { socialAnalystEmployee } from '@/lib/ai/employees/social-analyst';
import {
  kpiReviewSkill,
  type KpiReview,
  type KpiReviewInput,
} from '@/lib/ai/skills/kpi-review';

import { defineStep, runStep } from './step';

const KPI_REVIEW = defineStep(socialAnalystEmployee, kpiReviewSkill);

export function runKpiReview(input: KpiReviewInput): Promise<KpiReview> {
  return runStep(KPI_REVIEW, input);
}
