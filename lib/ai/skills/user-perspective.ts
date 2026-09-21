// 「利用者視点分析」Skill：Atlas利用者から見た価値・懸念を確認する。
// リヨウシャ（lib/ai/employees/user-advocate.ts）が経営判断室の議論で使う。

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION } from '@/lib/ai/core/atlas-context';
import { buildDiscussionContext } from '@/lib/ai/management/prompt';
import {
  userPerspectiveSchema,
  type DiscussionContext,
  type UserPerspective,
} from '@/lib/ai/management/types';

const USER_PERSPECTIVE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    userValue: { type: 'array', items: { type: 'string' } },
    userConcerns: { type: 'array', items: { type: 'string' } },
    questionsForOwner: { type: 'array', items: { type: 'string' } },
  },
  required: ['userValue', 'userConcerns', 'questionsForOwner'],
  additionalProperties: false,
} as const;

export const userPerspectiveSkill: Skill<DiscussionContext, UserPerspective> = {
  id: 'user-perspective',

  buildTaskInstructions: () => `Atlas利用者・顧客の視点から、案件がもたらす価値と懸念を確認することが仕事です。
社内都合ではなく、利用者から見てどう映るかを整理してください。

# Atlasについて
${ATLAS_DESCRIPTION}

# 進め方
- 案件が実現した場合、Atlas利用者にとってどんな価値があるかを具体的に整理する
- 利用者から見て懸念になりそうな点（使い勝手、信頼性、負担増など）を整理する
- 根拠のない「ユーザーはこう思うはず」という決めつけをしない。推測の場合はその旨を示す

# 出力形式
- userValue: 利用者にとっての価値（配列）
- userConcerns: 利用者視点での懸念（配列）
- questionsForOwner: 会長へ確認したいこと（配列。なければ空配列）`,

  buildUserPrompt: (ctx) => buildDiscussionContext(ctx.input),

  jsonSchema: USER_PERSPECTIVE_JSON_SCHEMA,
  outputSchema: userPerspectiveSchema,
};
