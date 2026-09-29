// 「国・地域別まとめの審査」Skill：公開前に、まとめが原則に合っているかを確かめ、合否を返す。

import type { Skill } from '@/lib/ai/core/skill';
import { GUIDE_PRINCIPLES, describeTarget } from '@/lib/ai/guides/prompt';
import {
  SOURCE_KIND_LABELS,
  reviewOutputSchema,
  type GuideContent,
  type GuideItem,
  type GuideTarget,
  type ReviewOutput,
} from '@/lib/ai/guides/types';

const REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          where: { type: 'string' },
          problem: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['where', 'problem', 'suggestion'],
        additionalProperties: false,
      },
    },
  },
  required: ['passed', 'issues'],
  additionalProperties: false,
} as const;

export type GuideReviewInput = { target: GuideTarget; content: GuideContent };

export const guideReviewSkill: Skill<GuideReviewInput, ReviewOutput> = {
  id: 'guide-review',

  buildTaskInstructions: () => `${GUIDE_PRINCIPLES}

# 仕事
公開前のまとめを確認し、合否（passed）と指摘（issues）を返してください。次のどれかに当たれば不合格です。
- 読者の代わりに判断している（「おすすめ」「正解」「一番」「〜すべき」、特定の選択肢に寄せた書き方）
- 調べた過程が書かれている（「今回」「確認できた範囲」「記載を確認できませんでした」「調査では」など）
- 比べるカードで、選択肢によって書き方の細かさや観点が揃っていない（同じ項目を同じ粒度で書いていない）
- 出典の無い項目がある、または出典の種類と内容が合っていない
- 特定の学校・施設・企業を持ち上げたり下げたりしている
- 個人を特定できる情報がある
- Atlasの経験談を公式情報のように書いている
指摘は、where（どの部品のどこか）、problem（何が問題か）、suggestion（どう直すか）で書く。
比べるカードの空欄（分からない項目）は、問題にしない。
問題が無ければ passed を true、issues を空にする。好みや文体だけの理由で不合格にしない。`,

  buildUserPrompt: ({ input }) => {
    const { content } = input;
    const sourceLabel = (id: number) => {
      const source = content.sources.find((item) => item.id === id);
      return source ? `[${SOURCE_KIND_LABELS[source.kind]}] ${source.title}` : '（出典なし）';
    };
    const line = (item: GuideItem) =>
      `${item.text}（出典: ${item.sourceIds.map(sourceLabel).join(' / ') || 'なし'}）`;
    const comparison = content.comparison;

    return [
      describeTarget(input.target),
      `# 冒頭\n${content.lead}`,
      `# まず知っておきたいこと\n${content.highlights.map((item) => `- ${line(item)}`).join('\n')}`,
      comparison
        ? `# 比べるカード「${comparison.title}」\n${comparison.options
            .map(
              (option) =>
                `## ${option.name}\n- 概要: ${line(option.summary)}\n${comparison.attributes
                  .map((attribute, index) => {
                    const cell = option.cells[index];
                    return `- ${attribute}: ${cell?.text ? line(cell) : '（空欄）'}`;
                  })
                  .join('\n')}`
            )
            .join('\n\n')}`
        : '',
      `# テーマ別の情報\n${content.topics
        .map((topic) => `## ${topic.heading}\n${topic.items.map((item) => `- ${line(item)}`).join('\n')}`)
        .join('\n\n')}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  },

  jsonSchema: REVIEW_JSON_SCHEMA,
  outputSchema: reviewOutputSchema,
};
