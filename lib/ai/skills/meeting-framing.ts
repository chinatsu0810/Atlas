// 「会議進行：案件整理」Skill：会長が持ち込んだ案件について、現状・課題・仮説・
// 判断したいことを整理する。社長（lib/ai/employees/president.ts）が会議の冒頭で使う。

import type { Skill } from '@/lib/ai/core/skill';
import {
  meetingFramingSchema,
  type MeetingFraming,
} from '@/lib/ai/management/types';

const MEETING_FRAMING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    currentSituation: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
    hypotheses: { type: 'array', items: { type: 'string' } },
    decisionPoints: { type: 'array', items: { type: 'string' } },
  },
  required: ['currentSituation', 'issues', 'hypotheses', 'decisionPoints'],
  additionalProperties: false,
} as const;

export type MeetingFramingInput = {
  topic: string;
};

export const meetingFramingSkill: Skill<MeetingFramingInput, MeetingFraming> = {
  id: 'meeting-framing',

  buildTaskInstructions: () => `会長が持ち込んだ案件を、経営判断室が議論しやすい形に整理することが仕事です。
結論やあるべき方向性を示さず、議論の土台となる整理だけを行ってください。

# 出力形式
- currentSituation: 現状（一文〜数文で簡潔に）
- issues: 課題（配列）
- hypotheses: 考えられる仮説（配列。断定せず「〜かもしれない」の水準でよい）
- decisionPoints: 経営判断室で判断・検討したいこと（配列）`,

  buildUserPrompt: (ctx) => `# 会長が持ち込んだ案件
${ctx.input.topic}

上記の案件について、経営判断室が議論できるよう整理してください。`,

  jsonSchema: MEETING_FRAMING_JSON_SCHEMA,
  outputSchema: meetingFramingSchema,
};
