// 「企画」Skill：リサーチ結果をもとに、投稿の切り口・構成・投稿方針を決める。
// 本文の執筆は行わない（それはライターの仕事）。Threadsチーム5役化で新設。

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION, ATLAS_PHILOSOPHY } from '@/lib/ai/core/atlas-context';

import {
  buildResonanceSection,
  buildTeamContext,
  TONE_DESCRIPTIONS,
} from '@/lib/ai/social/prompt';
import {
  MAX_POST_LENGTH,
  RECOMMENDED_POST_LENGTH_MAX,
  RECOMMENDED_POST_LENGTH_MIN,
} from '@/lib/ai/social/post-length';
import {
  postPlanSchema,
  type GenerateSocialDraftInput,
  type PostPlan,
  type ResearchResult,
} from '@/lib/ai/social/types';

const POST_PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    angle: { type: 'string' },
    angleOptions: { type: 'array', items: { type: 'string' } },
    structure: { type: 'array', items: { type: 'string' } },
    policy: { type: 'string' },
    rationale: { type: 'string' },
  },
  required: ['angle', 'angleOptions', 'structure', 'policy', 'rationale'],
  additionalProperties: false,
} as const;

export type ThreadPlanningInput = {
  draftInput: GenerateSocialDraftInput;
  research: ResearchResult;
};

export const threadPlanningSkill: Skill<ThreadPlanningInput, PostPlan> = {
  id: 'thread-planning',

  buildTaskInstructions: () => `リサーチャーが整理した材料をもとに、投稿の切り口・構成・投稿方針を決めることが仕事です。
投稿文そのものは書きません（それはライターの仕事です）。ライターが企画判断に迷わないよう、
方針をここで確定させてください。

# Atlasについて
${ATLAS_DESCRIPTION}

${ATLAS_PHILOSOPHY}

# トーンの意味
${TONE_DESCRIPTIONS}

# 企画の方針（ライターの書き方の方針と揃える）
- 優先順位は 経験 > 共感 > 気づき > Atlasの思想 > ノウハウ。ノウハウは最後で、投稿の中心にしない
- 「読んで勉強になった」ではなく、「それ知りたい」「経験者に聞いてみたい」「私も経験を残したい」
  「Atlasを見てみよう」と思われる切り口を選ぶ
- 実際に困ったこと・意外だったこと・検索では出てこなかったこと・失敗談・後悔・助かった経験・
  当事者しか分からないこと・帰国後に思うこと・子育てや生活のリアルを軸にする
- 手順解説・チェックリスト・網羅的説明・制度説明だけの構成にしない
- 投稿は最大${MAX_POST_LENGTH}文字（推奨${RECOMMENDED_POST_LENGTH_MIN}〜${RECOMMENDED_POST_LENGTH_MAX}文字）。
  段落数は少なく、全部を伝える構成にしない。最初の1文でスクロールを止める書き出しの方向性を決める

# あなたの仕事
1. リサーチ結果から考えられる切り口を複数検討する
2. その中から、経験・共感が中心になり、最も「知りたい・聞きたい・残したい」と思われる切り口を1つ選ぶ（採用理由も示す）
3. 投稿の構成（段落ごとにどう展開するか）を決める。最初の1文の方向性（何で目を止めるか）も含める
4. ライターへの投稿方針（トーンの当て方、Atlas紹介の扱い方など）をメモとして残す

# 出力形式
- angle: 採用する切り口（一文で具体的に）
- angleOptions: 検討した切り口の選択肢（採用しなかったものも含め、2〜4件程度）
- structure: 投稿の構成。段落ごとの役割を配列で（例：「導入：読者への共感」「本論：悩みの具体化」など）
- policy: ライターへの投稿方針メモ（トーンの当て方、Atlas紹介の入れ方・入れ方の強弱など）
- rationale: なぜこの切り口・構成を選んだか`,

  buildUserPrompt: (ctx) => {
    const { draftInput, research } = ctx.input;

    return `${buildTeamContext(draftInput)}

${buildResonanceSection(research)}

# リサーチ結果
読者の悩み: ${research.readerConcerns.join(' / ') || 'なし'}
読者が反応している言葉: ${research.keywords.join(' / ') || 'なし'}
経験を語れる論点: ${research.talkingPoints.join(' / ') || 'なし'}
Atlasを紹介できる接点: ${research.atlasConnectionIdeas.join(' / ') || 'なし'}

上記の条件で、投稿の切り口・構成・方針を決めてください。`;
  },

  jsonSchema: POST_PLAN_JSON_SCHEMA,
  outputSchema: postPlanSchema,
};
