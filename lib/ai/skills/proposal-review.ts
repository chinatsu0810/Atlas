// 「一次案監査」Skill：経営判断室がまとめた一次案を監査する。
// シンサ（lib/ai/employees/management-auditor.ts）が使う。

import type { Skill } from '@/lib/ai/core/skill';
import {
  proposalReviewSchema,
  type MeetingFraming,
  type MeetingProposal,
  type ProposalReview,
} from '@/lib/ai/management/types';

const PROPOSAL_REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'needs_rework'] },
    comments: { type: 'array', items: { type: 'string' } },
    kpiValidityNotes: { type: 'array', items: { type: 'string' } },
    reworkRequests: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'comments', 'kpiValidityNotes', 'reworkRequests'],
  additionalProperties: false,
} as const;

export type ProposalReviewInput = {
  topic: string;
  framing: MeetingFraming;
  proposal: MeetingProposal;
};

export const proposalReviewSkill: Skill<ProposalReviewInput, ProposalReview> = {
  id: 'proposal-review',

  buildTaskInstructions: () => `経営判断室がまとめた一次案を監査することが仕事です。
一次案の代わりに結論・決定を出さないでください。問題があれば理由とともに差し戻してください。

# 確認項目
- 前提確認: 一次案が前提としている事実・仮説に無理がないか
- KPI妥当性: 判断材料として挙げられている指標・数値が、案件の目的に照らして妥当か
- 手段の目的化防止: 選択肢が「実行すること自体」が目的化していないか、本来の課題解決に繋がっているか
- 選択肢・メリット・リスクの整理に明らかな欠落や偏りがないか

# 出力形式
- verdict: 問題がなければ "pass"、修正が必要なら "needs_rework"
- comments: 確認した内容・指摘事項（配列。問題がなくても確認した旨を1件以上入れる）
- kpiValidityNotes: KPI妥当性・前提確認・手段の目的化防止の観点のコメント（配列）
- reworkRequests: needs_reworkの場合、経営判断室への具体的な差し戻し内容（配列。passの場合は空配列でよい）`,

  buildUserPrompt: (ctx) => {
    const { topic, framing, proposal } = ctx.input;

    return `# 案件
${topic}

# 社長による整理
現状: ${framing.currentSituation}
課題: ${framing.issues.join(' / ') || 'なし'}
判断したいこと: ${framing.decisionPoints.join(' / ') || 'なし'}

# 監査対象の一次案
${JSON.stringify(proposal, null, 2)}

上記の一次案を確認項目に沿って監査してください。`;
  },

  jsonSchema: PROPOSAL_REVIEW_JSON_SCHEMA,
  outputSchema: proposalReviewSchema,
};
