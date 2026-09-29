// 「国・地域別まとめの正誤チェック」Skill：調査で集めた情報を、出典と照らし合わせる。
// mode 'excerpts': 調査のときの検索結果の引用部分と照らし合わせる（ページは開かない。runStep で実行）。
// mode 'fetch': 引用部分で確かめられなかったものだけ、ページを開いて確かめる（runWebStep で実行）。

import type { Skill } from '@/lib/ai/core/skill';
import { GUIDE_PRINCIPLES } from '@/lib/ai/guides/prompt';
import {
  FACT_VERDICTS,
  factCheckOutputSchema,
  type FactCheckOutput,
  type GuideResearch,
} from '@/lib/ai/guides/types';

const FACT_CHECK_JSON_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factId: { type: 'integer' },
          verdict: { type: 'string', enum: [...FACT_VERDICTS] },
          note: { type: 'string' },
        },
        required: ['factId', 'verdict', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const;

export type GuideFactCheckInput = { research: GuideResearch; mode: 'excerpts' | 'fetch' };

export const guideFactCheckSkill: Skill<GuideFactCheckInput, FactCheckOutput> = {
  id: 'guide-fact-check',
  maxTokens: 16000,

  buildTaskInstructions: ({ input }) => `${GUIDE_PRINCIPLES}

# 仕事
${
  input.mode === 'excerpts'
    ? '一覧の情報を、それぞれの出典の「引用部分」と照らし合わせて、1つずつ確かめてください。ページは開けません。引用部分に書かれていないことは unverifiable にします。'
    : '一覧の情報を、出典のページを実際に開いて1つずつ確かめてください。'
}
- confirmed: 出典に、同じ内容が書かれている。
- mismatch: 出典の内容と食い違う（金額・日付・条件の違いを含む）。
- unverifiable: ページを開けない、引用部分やページに該当する記述が見つからない。
- note には、判定の理由を短く書く（mismatch なら、出典に実際に書かれていること）。
- すべての情報（factId）について、1つずつ判定を返す。`,

  buildUserPrompt: ({ input }) => {
    const sourceOf = (id: number) => input.research.sources.find((source) => source.id === id);
    return `# 確かめる情報
${input.research.facts
  .map((fact) => {
    const source = sourceOf(fact.sourceId);
    const excerpts =
      input.mode === 'excerpts'
        ? `\n  引用部分: ${
            source?.excerpts?.length ? source.excerpts.map((text) => `「${text}」`).join(' ') : '（なし）'
          }`
        : '';
    return `- factId ${fact.id}: ${fact.claim}\n  出典: ${source?.title ?? ''} ${source?.url ?? ''}${excerpts}`;
  })
  .join('\n')}`;
  },

  jsonSchema: FACT_CHECK_JSON_SCHEMA,
  outputSchema: factCheckOutputSchema,
};
