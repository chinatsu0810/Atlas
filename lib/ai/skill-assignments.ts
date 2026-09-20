// 「どの社員がどのスキルを使えるか」を宣言する、唯一の場所。
//
// Employee は人格（名前・役割・口調・目的・禁止事項）だけを持ち、Skill は社員から独立して
// 管理される。両者をつなぐのはこの割り当て表のみ。社員は複数のスキルを持てるし、
// 同じスキルを複数の社員が使ってもよい（例: fact-check）。
//
// Workflow（lib/ai/workflows）はステップを定義する際にこの表を確認し（defineStep）、
// 割り当てのない組み合わせはモジュール読み込み時に失敗する。

import type { Employee } from '@/lib/ai/core/employee';
import type { AnySkill } from '@/lib/ai/core/skill';

import { socialResearcherEmployee } from '@/lib/ai/employees/social-researcher';
import { socialPlannerEmployee } from '@/lib/ai/employees/social-planner';
import { socialWriterEmployee } from '@/lib/ai/employees/social-writer';
import { socialEditorEmployee } from '@/lib/ai/employees/social-editor';
import { socialAnalystEmployee } from '@/lib/ai/employees/social-analyst';
import { presidentEmployee } from '@/lib/ai/employees/president';
import { whyAnalystEmployee } from '@/lib/ai/employees/why-analyst';
import { decisionMakerEmployee } from '@/lib/ai/employees/decision-maker';
import { contrarianEmployee } from '@/lib/ai/employees/contrarian';
import { userAdvocateEmployee } from '@/lib/ai/employees/user-advocate';
import { exitPlannerEmployee } from '@/lib/ai/employees/exit-planner';
import { managementAuditorEmployee } from '@/lib/ai/employees/management-auditor';

import { threadResearchSkill } from '@/lib/ai/skills/thread-research';
import { threadTopicPlanningSkill } from '@/lib/ai/skills/thread-topic-planning';
import { threadPlanningSkill } from '@/lib/ai/skills/thread-planning';
import { threadWritingSkill } from '@/lib/ai/skills/thread-writing';
import { threadQualityCheckSkill } from '@/lib/ai/skills/thread-quality-check';
import { meetingFramingSkill } from '@/lib/ai/skills/meeting-framing';
import { meetingSummarySkill } from '@/lib/ai/skills/meeting-summary';
import { whyAnalysisSkill } from '@/lib/ai/skills/why-analysis';
import { decisionFrameworkSkill } from '@/lib/ai/skills/decision-framework';
import { proposalDraftingSkill } from '@/lib/ai/skills/proposal-drafting';
import { riskCheckSkill } from '@/lib/ai/skills/risk-check';
import { userPerspectiveSkill } from '@/lib/ai/skills/user-perspective';
import { exitCriteriaSkill } from '@/lib/ai/skills/exit-criteria';
import { proposalReviewSkill } from '@/lib/ai/skills/proposal-review';
import { factCheckSkill } from '@/lib/ai/skills/fact-check';
import { kpiReviewSkill } from '@/lib/ai/skills/kpi-review';

const ASSIGNMENTS: [Employee, AnySkill[]][] = [
  // Threadsチーム
  [socialResearcherEmployee, [threadResearchSkill, threadTopicPlanningSkill]],
  [socialPlannerEmployee, [threadPlanningSkill]],
  [socialWriterEmployee, [threadWritingSkill]],
  [socialEditorEmployee, [threadQualityCheckSkill, factCheckSkill]],
  [socialAnalystEmployee, [kpiReviewSkill]],

  // 社長・経営判断室・監査室
  [presidentEmployee, [meetingFramingSkill, meetingSummarySkill]],
  [whyAnalystEmployee, [whyAnalysisSkill]],
  [decisionMakerEmployee, [decisionFrameworkSkill, proposalDraftingSkill]],
  [contrarianEmployee, [riskCheckSkill]],
  [userAdvocateEmployee, [userPerspectiveSkill]],
  [exitPlannerEmployee, [exitCriteriaSkill]],
  [managementAuditorEmployee, [proposalReviewSkill, factCheckSkill]],
];

// employeeId → 使えるskillIdの一覧
const SKILL_ASSIGNMENTS: Record<string, readonly string[]> = Object.fromEntries(
  ASSIGNMENTS.map(([employee, skills]) => [
    employee.id,
    skills.map((skill) => skill.id),
  ])
);

export function isSkillAssigned(employeeId: string, skillId: string): boolean {
  return SKILL_ASSIGNMENTS[employeeId]?.includes(skillId) ?? false;
}

export function getAssignedSkillIds(employeeId: string): readonly string[] {
  return SKILL_ASSIGNMENTS[employeeId] ?? [];
}
