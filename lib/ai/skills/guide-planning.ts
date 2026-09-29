// 「国・地域別まとめの企画」Skill：国・地域・テーマに合わせて、
// 比べる選択肢と項目（比べるカード）と、テーマ別の情報の見出し・調べる問いを決める。
// 企画のあとは会長が確認・手直しし、そのうえで調査に進む。

import type { Skill } from '@/lib/ai/core/skill';
import { GUIDE_PRINCIPLES, describeAtlasPosts, describeTarget } from '@/lib/ai/guides/prompt';
import { guidePlanSchema, type GuidePlan, type GuideTarget } from '@/lib/ai/guides/types';

const PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    comparison: {
      anyOf: [
        {
          type: 'object',
          properties: {
            title: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            attributes: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'options', 'attributes'],
          additionalProperties: false,
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
          questions: { type: 'array', items: { type: 'string' } },
        },
        required: ['key', 'heading', 'questions'],
        additionalProperties: false,
      },
    },
  },
  required: ['comparison', 'topics'],
  additionalProperties: false,
} as const;

export type GuidePlanningInput = {
  target: GuideTarget;
  chairmanNote?: string;
  // 会長が企画を差し戻したときの、前の企画とコメント
  previousPlan?: GuidePlan;
  chairmanFeedback?: string;
};

export const guidePlanningSkill: Skill<GuidePlanningInput, GuidePlan> = {
  id: 'guide-planning',

  buildTaskInstructions: () => `${GUIDE_PRINCIPLES}

# 仕事
読者が「自分の場合はどれか」を判断しやすいまとめの設計を決めてください。まとめは次の形で表示されます。
- 比べるカード（comparison）: 選択肢ごとに1枚のカード。すべてのカードが同じ項目を同じ順で持つ。
- テーマ別の情報（topics）: 「費用」「入学・編入」などの見出しごとのカード。
- まず知っておきたいこと: 調査担当が、全体に関わる大事な前提を集める（企画では決めない）。

## 比べるカード
- テーマに選択肢があるときだけ作る（学校・教育なら「日本人学校／インターナショナルスクール／現地校」、医療なら「私立病院／公立病院／日系クリニック」、住まいなら「サービスアパート／コンドミニアム／一戸建て」）。
  比べるものが無いテーマ（手続きの流れなど）では null にする。
- options は3つまで。種類の名前で書く（特定の学校名・会社名にしない）。
- attributes は4〜5つ。短い名詞で、どの選択肢にも当てはまる観点にする（例: 授業の言語／カリキュラム／学年の始まり／対象の年齢／費用の目安）。
- title はカードの見出し（例: 学校の種類）。

## テーマ別の情報
- 2〜3個。見出しは短く（例: 費用／入学・編入／通学）。
- key は英小文字とハイフンだけの短い識別子。
- questions は1〜2個。公式サイトなどで確かめられる、的を絞った問いにする。
- 調査担当のWeb検索は全部で7回までなので、比べるカードの表を埋めることと合わせて、欲張らない。

Atlasの経験談・Q&Aのタイトルは、読者が何に悩んでいるかの参考にする。`,

  buildUserPrompt: ({ input }) =>
    [
      describeTarget(input.target),
      describeAtlasPosts(input.target),
      input.chairmanNote ? `# 会長からの指示\n${input.chairmanNote}` : '',
      input.previousPlan ? `# 前の企画（会長が差し戻したもの）\n${JSON.stringify(input.previousPlan, null, 2)}` : '',
      input.chairmanFeedback ? `# 会長のコメント（これに沿って作り直す）\n${input.chairmanFeedback}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),

  jsonSchema: PLAN_JSON_SCHEMA,
  outputSchema: guidePlanSchema,
};
