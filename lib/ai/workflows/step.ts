// Workflow層の最小単位「ステップ」＝「誰が（Employee）」「どのスキルで（Skill）」動くか。
//
// Workflowはステップを宣言し、実行順・分岐・人間の入力待ちを管理する。Employeeどうしが
// 直接会話することはなく、必ずWorkflowが1ステップずつ呼び出す。

import type { Employee } from '@/lib/ai/core/employee';
import { runSkill, type RunSkillOptions, type Skill } from '@/lib/ai/core/skill';
import { isSkillAssigned } from '@/lib/ai/skill-assignments';

export class SkillNotAssignedError extends Error {}

export type WorkflowStep<TInput, TOutput> = {
  readonly employee: Employee;
  readonly skill: Skill<TInput, TOutput>;
};

// 割り当てのない組み合わせは、モジュール読み込み時（ステップ定義時）に失敗させる
export function defineStep<TInput, TOutput>(
  employee: Employee,
  skill: Skill<TInput, TOutput>
): WorkflowStep<TInput, TOutput> {
  if (!isSkillAssigned(employee.id, skill.id)) {
    throw new SkillNotAssignedError(
      `${employee.name}（${employee.id}）にはスキル ${skill.id} が割り当てられていません。` +
        'lib/ai/skill-assignments.ts を確認してください。'
    );
  }

  return { employee, skill };
}

export function runStep<TInput, TOutput>(
  step: WorkflowStep<TInput, TOutput>,
  input: TInput,
  options?: RunSkillOptions
): Promise<TOutput> {
  return runSkill(step.skill, step.employee, input, options);
}
