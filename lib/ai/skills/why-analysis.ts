// 「なぜなぜ分析」Skill：案件の原因を掘り下げ、判断理由を明確化する。
// ナゼ（lib/ai/employees/why-analyst.ts）が経営判断室の議論で使う。

import type { Skill } from '@/lib/ai/core/skill';
import { buildDiscussionContext } from '@/lib/ai/management/prompt';
import {
  whyAnalysisSchema,
  type DiscussionContext,
  type WhyAnalysis,
} from '@/lib/ai/management/types';

const WHY_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    chain: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
        additionalProperties: false,
      },
    },
    facts: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    questionsForOwner: { type: 'array', items: { type: 'string' } },
  },
  required: ['chain', 'facts', 'assumptions', 'questionsForOwner'],
  additionalProperties: false,
} as const;

export const whyAnalysisSkill: Skill<DiscussionContext, WhyAnalysis> = {
  id: 'why-analysis',

  buildTaskInstructions: () => `案件について「なぜ」を繰り返し、原因と判断理由を掘り下げてください。

# 進め方
- 「なぜそれが課題なのか」「なぜその仮説が成り立つのか」を、最大5段階程度まで掘り下げる
- 掘り下げの過程で、事実（確認できていること）と推測（まだ確認できていないこと）を明確に分ける
- 判断に必要な情報が不足している場合は questionsForOwner に会長への質問として整理する
- 5段階を超えて過度に掘り下げない。意味のある深さに達したら止める

# 出力形式
- chain: 「なぜ」の掘り下げ（question/answerのペアの配列。最大5段階程度）
- facts: 掘り下げの中で確認できた事実（配列）
- assumptions: 掘り下げの中で見えてきた推測・未確認の前提（配列）
- questionsForOwner: 判断に必要だが情報が不足している場合、会長へ確認したいこと（配列。なければ空配列）`,

  buildUserPrompt: (ctx) => buildDiscussionContext(ctx.input),

  jsonSchema: WHY_ANALYSIS_JSON_SCHEMA,
  outputSchema: whyAnalysisSchema,
};
