// 「一次案作成」Skill：経営判断室の議論を踏まえ、選択肢・メリット・リスク・判断材料・
// 未確認事項を整理する。意思決定担当（lib/ai/employees/decision-maker.ts）が使う。
// どれを選ぶべきかという結論は出さない。監査室から差し戻された場合は reworkFeedback を
// 踏まえて作り直す。

import type { Skill } from '@/lib/ai/core/skill';
import {
  meetingProposalSchema,
  type MeetingFraming,
  type MeetingProposal,
  type OwnerAnswer,
  type PriorStatement,
  type ProposalReview,
} from '@/lib/ai/management/types';

const MEETING_PROPOSAL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          option: { type: 'string' },
          pros: { type: 'array', items: { type: 'string' } },
          cons: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
        },
        required: ['option', 'pros', 'cons', 'risks'],
        additionalProperties: false,
      },
    },
    judgmentMaterials: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['options', 'judgmentMaterials', 'openQuestions'],
  additionalProperties: false,
} as const;

export type ProposalDraftingInput = {
  topic: string;
  framing: MeetingFraming;
  discussionStatements: PriorStatement[];
  ownerAnswers: OwnerAnswer[];
  reworkFeedback?: ProposalReview;
};

export const proposalDraftingSkill: Skill<ProposalDraftingInput, MeetingProposal> = {
  id: 'proposal-drafting',

  buildTaskInstructions: () => `経営判断室のこれまでの議論を統合し、会長が判断するための一次案を
まとめることが仕事です。どの選択肢を選ぶべきかという結論は絶対に出さないでください。
あなたの仕事は選択肢・メリット・リスク・判断材料・未確認事項を漏れなく整理することです。

# 出力形式
- options: 選択肢の配列。各要素は次を持つ
  - option: 選択肢の内容
  - pros: メリット（配列）
  - cons: デメリット（配列）
  - risks: リスク（配列）
- judgmentMaterials: 判断材料として重要な情報（配列）
- openQuestions: まだ確認・検証できていない事項（配列）`,

  buildUserPrompt: (ctx) => {
    const { topic, framing, discussionStatements, ownerAnswers, reworkFeedback } =
      ctx.input;

    const discussionSection = discussionStatements
      .map(
        (statement) =>
          `## ${statement.employeeName}（${statement.employeeRole}）\n${JSON.stringify(statement.content)}`
      )
      .join('\n\n');

    const ownerAnswerSection =
      ownerAnswers.length > 0
        ? ownerAnswers
            .map((qa) => `- 質問: ${qa.question}\n  会長の回答: ${qa.answer}`)
            .join('\n')
        : 'なし';

    const reworkSection = reworkFeedback
      ? `

# 監査室からの差し戻し（前回案への指摘。必ず反映すること）
判定: ${reworkFeedback.verdict}
コメント: ${reworkFeedback.comments.join(' / ') || 'なし'}
差し戻し内容: ${reworkFeedback.reworkRequests.join(' / ') || 'なし'}`
      : '';

    return `# 案件
${topic}

# 社長による整理
現状: ${framing.currentSituation}
課題: ${framing.issues.join(' / ') || 'なし'}
仮説: ${framing.hypotheses.join(' / ') || 'なし'}
判断したいこと: ${framing.decisionPoints.join(' / ') || 'なし'}

# 経営判断室の議論
${discussionSection || 'なし'}

# 会長への質問と回答
${ownerAnswerSection}
${reworkSection}

上記を踏まえて、会長が判断するための一次案を整理してください。`;
  },

  jsonSchema: MEETING_PROPOSAL_JSON_SCHEMA,
  outputSchema: meetingProposalSchema,
};
