// 「国・地域別まとめの執筆」Skill：正誤チェックで確認済みの情報だけを使って、
// ① まず知っておきたいこと ② 比べるカード ③ テーマ別の情報 を書く。

import type { Skill } from '@/lib/ai/core/skill';
import { GUIDE_PRINCIPLES, describeTarget } from '@/lib/ai/guides/prompt';
import {
  COMPARISON_SECTION,
  HIGHLIGHT_SECTION,
  writingOutputSchema,
  type GuideFact,
  type GuidePlan,
  type GuideTarget,
  type ReviewOutput,
  type WritingOutput,
} from '@/lib/ai/guides/types';

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    factIds: { type: 'array', items: { type: 'integer' } },
  },
  required: ['text', 'factIds'],
  additionalProperties: false,
} as const;

const WRITING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    lead: { type: 'string' },
    highlights: { type: 'array', items: ITEM_SCHEMA },
    comparison: {
      anyOf: [
        {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              option: { type: 'string' },
              summary: ITEM_SCHEMA,
              cells: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    attribute: { type: 'string' },
                    text: { type: 'string' },
                    factIds: { type: 'array', items: { type: 'integer' } },
                  },
                  required: ['attribute', 'text', 'factIds'],
                  additionalProperties: false,
                },
              },
            },
            required: ['option', 'summary', 'cells'],
            additionalProperties: false,
          },
        },
        { type: 'null' },
      ],
    },
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          heading: { type: 'string' },
          items: { type: 'array', items: ITEM_SCHEMA },
        },
        required: ['key', 'heading', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['lead', 'highlights', 'comparison', 'topics'],
  additionalProperties: false,
} as const;

export type GuideWritingInput = {
  target: GuideTarget;
  plan: GuidePlan;
  // 正誤チェックで確認済みの情報だけ
  facts: GuideFact[];
  // 審査の指摘（書き直しのとき）
  review?: ReviewOutput;
  // 会長の差し戻しコメント（書き直しのとき）
  chairmanFeedback?: string;
};

function describeFact(fact: GuideFact) {
  const where = fact.section === COMPARISON_SECTION ? `比べる: ${fact.option} × ${fact.attribute}` : fact.section;
  return `- factId ${fact.id}（${where}）: ${fact.claim}`;
}

export const guideWritingSkill: Skill<GuideWritingInput, WritingOutput> = {
  id: 'guide-writing',
  maxTokens: 16000,

  buildTaskInstructions: () => `${GUIDE_PRINCIPLES}

# 仕事
一覧の「確認済みの情報」だけを使って、まとめを書いてください。読者が見比べて、自分で判断しやすいことを最優先にします。

- lead: ページの冒頭に置く1文。このページで何を比べ・確かめられるかだけを書く（調べた過程や、判断を促す言葉は入れない）。
- highlights（まず知っておきたいこと）: 2〜4個。全体に関わる大事な前提を、1項目1文で。
- comparison（比べるカード）: 企画の選択肢ごとに1つ。企画に比べるカードが無ければ null。
  - summary: その選択肢がどんなものかを1文で。
  - cells: 企画の項目を、企画と同じ順ですべて並べる。text は短く（体言止め・20字程度まで。例:「日本語」「4月」「IB・ケンブリッジなど（学校による）」）。
    確認済みの情報が無い項目は text を空文字、factIds を空にする（「不明」「確認できない」とは書かない）。
- topics（テーマ別の情報）: 企画の見出しの順に。1項目は1〜2文。情報が1つも無い見出しは出さない。
- すべての項目に、根拠にした情報の factId を factIds に入れる（1つ以上）。
- 確認済みの情報に無いことは書かない。金額・日付は情報の表記のまま。`,

  buildUserPrompt: ({ input }) => {
    const { comparison, topics } = input.plan;
    return [
      describeTarget(input.target),
      comparison
        ? `# 比べるカード「${comparison.title}」\n- 選択肢: ${comparison.options.join('／')}\n- 項目（この順で）: ${comparison.attributes.join('／')}`
        : '# 比べるカード\n（無し。comparison は null）',
      `# テーマ別の情報の見出し\n${topics.map((topic) => `- ${topic.heading}（key: ${topic.key}）`).join('\n')}`,
      `# 確認済みの情報（${HIGHLIGHT_SECTION} は全体の前提）\n${input.facts.map(describeFact).join('\n')}`,
      input.review && !input.review.passed
        ? `# 審査の指摘（直してください）\n${input.review.issues
            .map((issue) => `- ${issue.where}: ${issue.problem} → ${issue.suggestion}`)
            .join('\n')}`
        : '',
      input.chairmanFeedback ? `# 会長からの差し戻しコメント（直してください）\n${input.chairmanFeedback}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  },

  jsonSchema: WRITING_JSON_SCHEMA,
  outputSchema: writingOutputSchema,
};
