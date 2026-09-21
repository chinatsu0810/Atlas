// 「KPIレビュー」Skill：与えられた数字をもとに、傾向・懸念・仮説・改善材料を整理する。
// 分析担当（lib/ai/employees/social-analyst.ts）が使う想定の、チームに依存しない汎用Skill。
// 数字の自動収集は行わない（入力として渡された数字だけを分析する）。
// 「次はこうすべき」という決定はせず、会長・運営が判断するための材料として整理する。

import { z } from 'zod';

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION } from '@/lib/ai/core/atlas-context';

export const kpiReviewSchema = z.object({
  highlights: z.array(z.string()), // 数字から読み取れる良い傾向
  concerns: z.array(z.string()), // 数字から読み取れる懸念
  hypotheses: z.array(z.string()), // 傾向の理由についての仮説（未検証のもの）
  improvementIdeas: z.array(z.string()), // 改善材料（判断は会長・運営が行う）
  dataLimitations: z.array(z.string()), // データの限界（サンプル数・期間・欠損など）
});

export type KpiReview = z.infer<typeof kpiReviewSchema>;

const KPI_REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    highlights: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    hypotheses: { type: 'array', items: { type: 'string' } },
    improvementIdeas: { type: 'array', items: { type: 'string' } },
    dataLimitations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'highlights',
    'concerns',
    'hypotheses',
    'improvementIdeas',
    'dataLimitations',
  ],
  additionalProperties: false,
} as const;

export type KpiReviewInput = {
  // 対象の期間（例: 「2026年9月第3週」）
  period: string;
  metrics: { name: string; value: string; previousValue?: string }[];
  // 背景情報（施策・出来事など。任意）
  context?: string;
};

export const kpiReviewSkill: Skill<KpiReviewInput, KpiReview> = {
  id: 'kpi-review',

  buildTaskInstructions: () => `与えられたKPI・数字を分析し、傾向・懸念・仮説・改善材料を整理することが仕事です。
「次はこうすべき」という決定はせず、会長・運営が判断するための材料として整理してください。

# Atlasについて
${ATLAS_DESCRIPTION}

# 進め方
- 前回値がある指標は、増減とその大きさを踏まえて傾向を読む
- サンプル数が少ない・期間が短い・前回値がない場合は、断定せず「傾向の可能性」として扱う
- 傾向の理由は仮説として書き、事実と区別する
- 数字から言えないこと（因果の断定など）は書かない
- 背景情報に書かれている数字（「反応があった投稿の数」など）は、そのまま使う。一覧の一部を見て、件数を推測しない。
  一覧に載っていない投稿については、内容を推測して書かない
- 背景情報に投稿の一覧（投稿日時・冒頭・文字数・各数字）がある場合は、時間帯・曜日・文字数・書き出しの形（問いかけの有無など）・
  テーマの違いによる傾向も見てよい。ただし、件数が少ないため、必ず仮説として書く
- Threads APIで取得できる指標は、閲覧・いいね・返信・リポスト・引用・シェア・フォロワー数（ほかに、リンクのクリック数、フォロワーの属性）。
  保存数・プロフィールへのアクセス数は取得できないので、指標として挙げたり、「取得できれば」と提案したりしない

# 出力形式
- highlights: 数字から読み取れる良い傾向（配列）
- concerns: 数字から読み取れる懸念（配列）
- hypotheses: 傾向の理由についての仮説。未検証であることが分かる書き方で（配列）
- improvementIdeas: 改善のための材料・案（配列。決定ではなく選択肢として）
- dataLimitations: このデータから言えることの限界（サンプル数・期間・欠損など。配列）`,

  buildUserPrompt: (ctx) => {
    const { period, metrics, context } = ctx.input;

    const metricLines = metrics
      .map(
        (metric) =>
          `- ${metric.name}: ${metric.value}` +
          (metric.previousValue ? `（前回: ${metric.previousValue}）` : '')
      )
      .join('\n');

    return `# 対象期間
${period}

# 指標
${metricLines || 'なし'}

# 背景情報
${context?.trim() || 'なし'}

上記の数字を分析してください。`;
  },

  jsonSchema: KPI_REVIEW_JSON_SCHEMA,
  outputSchema: kpiReviewSchema,
};
