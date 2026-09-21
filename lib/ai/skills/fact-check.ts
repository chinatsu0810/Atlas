// 「事実確認」Skill：文章中の事実主張を洗い出し、確認できるものとできないものを区別する。
// ケンピン・シンサなど、複数の社員が使える汎用Skill。
// Web検索は行わない。渡された既知の事実との整合と、一般的な知識の範囲でのみ判断し、
// 確認できないものは「未確認」として扱う（推測を事実として扱わない）。

import { z } from 'zod';

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION } from '@/lib/ai/core/atlas-context';

export const factCheckSchema = z.object({
  claims: z.array(
    z.object({
      claim: z.string(), // 文章中の事実主張
      verdict: z.enum(['consistent', 'unverified', 'contradicted']),
      note: z.string(), // 判定の理由・確認方法の提案
    })
  ),
  summary: z.string(),
});

export type FactCheck = z.infer<typeof factCheckSchema>;

const FACT_CHECK_JSON_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          verdict: {
            type: 'string',
            enum: ['consistent', 'unverified', 'contradicted'],
          },
          note: { type: 'string' },
        },
        required: ['claim', 'verdict', 'note'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['claims', 'summary'],
  additionalProperties: false,
} as const;

export type FactCheckInput = {
  // 何についての文章か（例: 「Threads投稿案」「経営判断室の一次案」）
  subject: string;
  text: string;
  // 事実として確認済みの情報（任意）
  knownFacts?: string[];
};

export const factCheckSkill: Skill<FactCheckInput, FactCheck> = {
  id: 'fact-check',

  buildTaskInstructions: () => `文章に含まれる事実主張を洗い出し、それぞれが確認できるかどうかを整理することが仕事です。
あなた自身は文章を書き直しません。

# Atlasについて
${ATLAS_DESCRIPTION}

# 進め方
- 文章の中から、事実として述べられている主張（数値・固有名詞・制度・因果関係・「〜とされる」等の伝聞を含む）を抜き出す
- 各主張を次のいずれかに判定する
  - consistent: 渡された既知の事実、または確実な一般知識と矛盾せず、支持される
  - unverified: この情報だけでは確認できない（Web検索はできないため、確認できないものは必ずこちらにする）
  - contradicted: 既知の事実または確実な一般知識と矛盾する
- 推測や伝聞を、確認できたものとして扱わない。迷ったら unverified にする
- note には、判定の理由と、人間が確認する場合の方法を簡潔に書く

# 出力形式
- claims: 事実主張の配列（claim / verdict / note）
- summary: 全体の所見（一文〜数文。確認できなかった主張の扱いに触れる）`,

  buildUserPrompt: (ctx) => {
    const { subject, text, knownFacts } = ctx.input;

    return `# 対象
${subject}

# 確認済みの事実
${knownFacts && knownFacts.length > 0 ? knownFacts.map((fact) => `- ${fact}`).join('\n') : 'なし'}

# 文章
${text}

上記の文章の事実主張を確認してください。`;
  },

  jsonSchema: FACT_CHECK_JSON_SCHEMA,
  outputSchema: factCheckSchema,
};
