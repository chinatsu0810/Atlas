// 「会議進行：総括」Skill：事実・仮説・論点・選択肢・リスク・未解決事項を整理する。
// 社長（lib/ai/employees/president.ts）が会議の最後に使う。
// ここでも結論は出さない。最終的な会長への問いかけはWorkflow側で固定文言として付加する。

import type { Skill } from '@/lib/ai/core/skill';
import {
  meetingSummarySchema,
  type MeetingFraming,
  type MeetingProposal,
  type MeetingSummary,
  type ProposalReview,
} from '@/lib/ai/management/types';

const MEETING_SUMMARY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    facts: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    keyPoints: { type: 'array', items: { type: 'string' } },
    options: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'facts',
    'assumptions',
    'keyPoints',
    'options',
    'risks',
    'openQuestions',
  ],
  additionalProperties: false,
} as const;

export type MeetingSummaryInput = {
  topic: string;
  framing: MeetingFraming;
  proposal: MeetingProposal;
  proposalReview: ProposalReview;
};

export const meetingSummarySkill: Skill<MeetingSummaryInput, MeetingSummary> = {
  id: 'meeting-summary',

  buildTaskInstructions: () => `会議全体を総括することが仕事です。事実・仮説・論点・選択肢・リスク・
未解決事項を整理し、会長が判断しやすい形にまとめてください。
「これが正解です」「こうすべきです」のように、あなた自身の結論・推奨は絶対に述べないでください。

# 出力形式
- facts: 確認できた事実（配列）
- assumptions: 仮説・未確認の前提（配列）
- keyPoints: 論点（配列）
- options: 選択肢（一次案を簡潔に要約したもの。配列）
- risks: リスク（配列）
- openQuestions: 未解決事項（配列）`,

  buildUserPrompt: (ctx) => {
    const { topic, framing, proposal, proposalReview } = ctx.input;

    return `# 案件
${topic}

# 社長による整理
現状: ${framing.currentSituation}
課題: ${framing.issues.join(' / ') || 'なし'}
仮説: ${framing.hypotheses.join(' / ') || 'なし'}

# 経営判断室の一次案
${JSON.stringify(proposal, null, 2)}

# 監査室のレビュー結果
${JSON.stringify(proposalReview, null, 2)}

上記を踏まえて、会議全体を総括してください。`;
  },

  jsonSchema: MEETING_SUMMARY_JSON_SCHEMA,
  outputSchema: meetingSummarySchema,
};
