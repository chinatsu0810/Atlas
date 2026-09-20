// 「成功条件・撤退条件設定」Skill：成功条件・撤退条件・評価期間を設定する。
// 撤退判断担当（lib/ai/employees/exit-planner.ts）が経営判断室の議論で使う。
// 実行するかどうかの決定は行わない。

import type { Skill } from '@/lib/ai/core/skill';
import { buildDiscussionContext } from '@/lib/ai/management/prompt';
import {
  exitCriteriaSchema,
  type DiscussionContext,
  type ExitCriteria,
} from '@/lib/ai/management/types';

const EXIT_CRITERIA_JSON_SCHEMA = {
  type: 'object',
  properties: {
    successCriteria: { type: 'array', items: { type: 'string' } },
    exitCriteria: { type: 'array', items: { type: 'string' } },
    evaluationPeriod: { type: 'string' },
    questionsForOwner: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'successCriteria',
    'exitCriteria',
    'evaluationPeriod',
    'questionsForOwner',
  ],
  additionalProperties: false,
} as const;

export const exitCriteriaSkill: Skill<DiscussionContext, ExitCriteria> = {
  id: 'exit-criteria',

  buildTaskInstructions: () => `案件を実行する場合に備え、成功条件・撤退条件・評価期間を整理することが仕事です。
実行するかどうかの決定は行わず、後で会長・運営が判断できる基準だけを整理してください。

# 進め方
- 測定可能な成功条件を設定する（曖昧な表現を避ける）
- どうなったら撤退・中止を検討すべきかの条件を設定する
- いつまでに評価すべきか、評価期間の目安を示す
- 基準を決めるための情報が不足している場合は questionsForOwner に整理する

# 出力形式
- successCriteria: 成功条件（配列）
- exitCriteria: 撤退条件（配列）
- evaluationPeriod: 評価期間の目安（一文）
- questionsForOwner: 会長へ確認したいこと（配列。なければ空配列）`,

  buildUserPrompt: (ctx) => buildDiscussionContext(ctx.input),

  jsonSchema: EXIT_CRITERIA_JSON_SCHEMA,
  outputSchema: exitCriteriaSchema,
};
