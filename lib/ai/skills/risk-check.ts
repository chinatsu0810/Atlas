// 「リスク確認」Skill：前提を疑い、リスクを確認し、別解を提示する。
// 反対意見担当（lib/ai/employees/contrarian.ts）が経営判断室の議論で使う。
// 目的は否定ではなく判断品質の向上。

import type { Skill } from '@/lib/ai/core/skill';
import { buildDiscussionContext } from '@/lib/ai/management/prompt';
import {
  riskCheckSchema,
  type DiscussionContext,
  type RiskCheck,
} from '@/lib/ai/management/types';

const RISK_CHECK_JSON_SCHEMA = {
  type: 'object',
  properties: {
    challengedAssumptions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    alternatives: { type: 'array', items: { type: 'string' } },
    questionsForOwner: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'challengedAssumptions',
    'risks',
    'alternatives',
    'questionsForOwner',
  ],
  additionalProperties: false,
} as const;

export const riskCheckSkill: Skill<DiscussionContext, RiskCheck> = {
  id: 'risk-check',

  buildTaskInstructions: () => `他メンバーの発言を踏まえ、前提を疑い、リスクを確認し、別解を提示することが仕事です。
目的は否定することではなく、判断の品質を上げることです。

# 進め方
- 社長の整理や他メンバーの発言の中で、無批判に受け入れられている前提がないか確認する
- 見落とされていそうなリスクを挙げる
- 検討されていない別の選択肢・進め方があれば提示する
- 反対のための反対はしない。理由と代案をセットで示す

# 出力形式
- challengedAssumptions: 疑問を呈する前提（配列）
- risks: 見落とされていそうなリスク（配列）
- alternatives: 別解・代案（配列）
- questionsForOwner: 会長へ確認したいこと（配列。なければ空配列）`,

  buildUserPrompt: (ctx) => buildDiscussionContext(ctx.input),

  jsonSchema: RISK_CHECK_JSON_SCHEMA,
  outputSchema: riskCheckSchema,
};
