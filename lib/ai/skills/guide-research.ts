// 「国・地域別まとめの調査」Skill：企画（比べるカードの表と、テーマ別の問い）についてWebで調べ、
// 1つずつ出典を付けた情報として返す。Web検索を使うため、runWebSkill（lib/ai/core/web-skill.ts）で実行する。

import type { Skill } from '@/lib/ai/core/skill';
import { GUIDE_PRINCIPLES, describeTarget } from '@/lib/ai/guides/prompt';
import {
  COMPARISON_SECTION,
  HIGHLIGHT_SECTION,
  SOURCE_KINDS,
  researchOutputSchema,
  type GuidePlan,
  type GuideTarget,
  type ResearchOutput,
} from '@/lib/ai/guides/types';

const RESEARCH_JSON_SCHEMA = {
  type: 'object',
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          option: { type: 'string' },
          attribute: { type: 'string' },
          claim: { type: 'string' },
          sourceUrl: { type: 'string' },
          sourceKind: { type: 'string', enum: [...SOURCE_KINDS] },
        },
        required: ['section', 'option', 'attribute', 'claim', 'sourceUrl', 'sourceKind'],
        additionalProperties: false,
      },
    },
  },
  required: ['facts'],
  additionalProperties: false,
} as const;

export type GuideResearchInput = { target: GuideTarget; plan: GuidePlan };

export const guideResearchSkill: Skill<GuideResearchInput, ResearchOutput> = {
  id: 'guide-research',
  maxTokens: 16000,

  buildTaskInstructions: () => `${GUIDE_PRINCIPLES}

# 仕事
企画について、Webで調べてください。検索は全部で7回までです。似たことはまとめて1回で調べてください。
1. 比べるカードの表（選択肢 × 項目）を、できるだけ埋める。各選択肢の公式サイトや、大使館・公的機関のページを優先する。
2. テーマ別の情報の問いに答える。
3. 読者が最初に知っておくべき、全体に関わる大事な前提（2〜4個）を集める。

# 出力のしかた
- claim: 1つの事実を1〜2文で。出典のページに書かれている範囲だけを書く。
- section: 比べるカードの情報なら "${COMPARISON_SECTION}"、全体の前提なら "${HIGHLIGHT_SECTION}"、テーマ別の情報ならその見出しの key。
- option / attribute: 比べるカードの情報のときだけ、企画の選択肢と項目の名前を、企画と同じ表記で入れる。それ以外は空文字。
- sourceUrl: その情報が書かれているページのURL。検索結果・取得したページ以外のURLは使わない。
- sourceKind: government（公的機関）/ embassy（大使館・領事館）/ school（学校・施設の公式）/ organization（団体）/ media（報道・情報サイト）/ other。
- 見つからなかったことは、出力しない（「見つからなかった」という情報は作らない）。`,

  buildUserPrompt: ({ input }) => {
    const { comparison, topics } = input.plan;
    return [
      describeTarget(input.target),
      comparison
        ? `# 比べるカード「${comparison.title}」\n- 選択肢: ${comparison.options.join('／')}\n- 項目: ${comparison.attributes.join('／')}`
        : '# 比べるカード\n（このテーマでは作らない）',
      `# テーマ別の情報\n${topics
        .map((topic) => `## ${topic.heading}（key: ${topic.key}）\n${topic.questions.map((q) => `- ${q}`).join('\n')}`)
        .join('\n\n')}`,
    ].join('\n\n');
  },

  jsonSchema: RESEARCH_JSON_SCHEMA,
  outputSchema: researchOutputSchema,
};
