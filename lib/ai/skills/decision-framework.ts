// 「選択肢整理」Skill：選択肢・メリット/デメリット・判断材料を整理する。
// 意思決定担当（lib/ai/employees/decision-maker.ts）が経営判断室の議論で使う。
// どれを選ぶべきかという結論は出さない。

import type { Skill } from '@/lib/ai/core/skill';
import { buildDiscussionContext } from '@/lib/ai/management/prompt';
import {
  decisionOptionsSchema,
  type DecisionOptions,
  type DiscussionContext,
} from '@/lib/ai/management/types';

const DECISION_OPTIONS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    options: { type: 'array', items: { type: 'string' } },
    prosAndCons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          option: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
        },
        required: ['option', 'pros', 'cons'],
        additionalProperties: false,
      },
    },
    judgmentMaterials: { type: 'array', items: { type: 'string' } },
    questionsForOwner: { type: 'array', items: { type: 'string' } },
  },
  required: ['options', 'prosAndCons', 'judgmentMaterials', 'questionsForOwner'],
  additionalProperties: false,
} as const;

export const decisionFrameworkSkill: Skill<DiscussionContext, DecisionOptions> = {
  id: 'decision-framework',

  buildTaskInstructions: () => `案件について考えられる選択肢を整理し、それぞれのメリット・デメリット・
判断材料を整理することが仕事です。どの選択肢を選ぶべきかという結論は出さないでください。

# 進め方
- 案件・社長の整理・他メンバーの発言（あれば）を踏まえ、現実的な選択肢を2〜4件程度挙げる
- 「何もしない」という選択肢も、判断材料として妥当なら含める
- 各選択肢についてメリット・デメリットを偏りなく整理する
- 判断に必要な情報が不足している場合は questionsForOwner に整理する

# 出力形式
- options: 選択肢の一覧（配列）
- prosAndCons: 選択肢ごとのメリット・デメリット（配列）
- judgmentMaterials: 判断材料として重要な情報（配列）
- questionsForOwner: 会長へ確認したいこと（配列。なければ空配列）`,

  buildUserPrompt: (ctx) => buildDiscussionContext(ctx.input),

  jsonSchema: DECISION_OPTIONS_JSON_SCHEMA,
  outputSchema: decisionOptionsSchema,
};
