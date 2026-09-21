// 「執筆」Skill：企画担当が決めた切り口・構成・方針に沿って、Threads投稿案
// （本文・ハッシュタグ）を作成する。企画判断（切り口・構成の決定）は行わない。
// 書き方の方針（経験優先・文字数・最初の1文・禁止事項）はこのSkillの作業指示に置き、
// 人格（Atlasの思想を伝える編集者）は lib/ai/employees/social-writer.ts に置く。

import type { Skill } from '@/lib/ai/core/skill';
import {
  ATLAS_DESCRIPTION,
  ATLAS_PHILOSOPHY,
  BANNED_EXPRESSIONS,
} from '@/lib/ai/core/atlas-context';

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
  socialDraftOutputSchema,
  type AuditResult,
  type GenerateSocialDraftInput,
  type PostPlan,
  type ResearchResult,
  type SocialDraftOutput,
} from '@/lib/ai/social/types';

const SOCIAL_DRAFT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    draft: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['draft', 'hashtags', 'warnings'],
  additionalProperties: false,
} as const;

export type ThreadWritingInput = {
  draftInput: GenerateSocialDraftInput;
  research: ResearchResult;
  postPlan: PostPlan;
  revisionFeedback?: AuditResult;
};

export const threadWritingSkill: Skill<ThreadWritingInput, SocialDraftOutput> = {
  id: 'thread-writing',

  buildTaskInstructions: () => `企画担当が決めた切り口・構成・投稿方針に沿って、Threads向けの投稿「案」の
本文・ハッシュタグを書くことが仕事です。切り口や構成そのものは変更しないでください。
ただし、企画の内容が以下の方針（経験優先・ノウハウは最後）と衝突する場合は、方針を優先して
経験・共感の側に寄せて書き、その旨を warnings に書いてください。

# Atlasとは
${ATLAS_DESCRIPTION}

${ATLAS_PHILOSOPHY}

# 投稿の目的
投稿を読んだ人に「勉強になった」と思わせることが目的ではありません。
理想は、次のように思ってもらうことです。
- それ知りたい
- 経験者に聞いてみたい
- 私も経験を残したい
- Atlasを見てみよう

# 投稿で優先するもの（この順番）
1. 経験
2. 共感
3. 気づき
4. Atlasの思想
5. ノウハウ

ノウハウは最後です。書くとしても、経験の中でさりげなく触れる程度にとどめてください。

# 文字数
- 推奨: ${RECOMMENDED_POST_LENGTH_MIN}〜${RECOMMENDED_POST_LENGTH_MAX}文字
- 上限: ${MAX_POST_LENGTH}文字（ハッシュタグを含めた全体で数える）。超える場合は必ず削ること
- Threadsは記事ではありません。全部を伝える必要はありません。興味を持たせることを優先してください

# 最初の1文が最重要
タイムラインでは最初の1文しか見られません。最初の1文でスクロールを止めてください。
説明から始めてはいけません。

良い例:
- 正直、一番大変だったのは英語じゃなかった。
- 赴任前に知りたかったことは検索しても出てこなかった。
- 30記事読んだのに、一人の経験談が一番役に立った。
- 「それ先に言ってよ」と思ったことがある。
- 海外赴任が決まった日から、同じ検索を何度も繰り返した。

悪い例（書き出しにしてはいけない）:
- 海外赴任が決まったらやること
- 駐在準備の流れ
- 海外生活で大切なこと
- 今日は〇〇について解説します
- ①②③④形式の説明

# 書いてはいけない投稿
次のような投稿はAtlasらしくありません。
- 手順解説 / チェックリスト / 網羅的説明 / マニュアル化
- AIっぽい整理された文章 / ブログ記事の要約
- 箇条書き中心の構成 / 制度説明だけの投稿

# 書くべきテーマ
- 実際に困ったこと / 意外だったこと / 検索では出てこなかったこと
- 失敗談 / 後悔したこと / 助かった経験
- 当事者しか分からないこと / 帰国後に思うこと / 子育てや生活のリアル

# 経験を残す価値も伝える
Atlasでは、読む人だけでなく書く人の価値も伝えてください。
経験は消費されるものではありません。残すことで価値になります。
成功談だけでなく失敗談にも価値があります。
読んだ人が「私の経験にも価値があるかもしれない」と思えるようにしてください。

# 経験の語りについて
- 投稿は、上の良い例のように経験者の一人称で書いて構いません。
- ただしあなた（AI）には実体験がないため、書いた経験は「たたき台」です。検証できる細部
  （固有名詞・年月・金額・人数など）は作らず、誰の経験としても成り立つ範囲の感情や気づきを中心に書いてください。
  一人称の経験は、人間の担当者が実際の経験や実在の声に置き換えたうえで投稿する前提です。
- 一般論になってしまう場合は、経験者にしか語れない「感じたこと」「後から気づいたこと」に寄せてください。

# Atlasの紹介について
Atlasを紹介する指示がある場合は、宣伝文句ではなく、Atlasの思想（制度は検索できる、経験は検索できない、
経験者に聞ける／経験を残せる）として自然に触れてください。毎回同じ定型文にせず、テーマに合わせて言い回しを変えてください。
紹介の参考例（そのまま使わず、言い換えること）：
「Atlasでは、実際に経験した人に、海外生活のリアルを聞けます。」

# トーンの意味
${TONE_DESCRIPTIONS}

# リサーチ結果の扱い
- リサーチ結果の unverifiedClaimsToAvoid にある内容は、投稿に含めないでください。
- factsToVerify にある内容を使う場合、断定表現を避け、必要であれば warnings に注意点を追加してください。
- sources が空のリサーチ内容は、一般論・体験談ベースの表現にとどめ、統計や固有の事実として断定しないでください。
- 制度や手続きの説明材料は、投稿の中心にしないでください（ノウハウは最後）。
- 「リサーチ担当が見立てた感情が動いているテーマ」がある場合は、そこにある感情を投稿の軸にしてください。
  「経験投稿につながる問い」は、投稿の終わりの問いかけ（読んだ人が自分の経験を語りたくなる問い）のヒントにしてかまいません。
- その見立てが「AIの見立て（仮説）」の場合、「反応が多い」「話題になっている」「共感が集まっている」など、
  見ていない事実として書かないでください。

# 断定的な表現について
次のような断定的な表現は使わないでください: ${BANNED_EXPRESSIONS.join('、')}

# 書き終えたら自己チェックする
この投稿を読んだ人は、「なるほど」で終わるでしょうか？
それとも「知りたい」「聞きたい」「残したい」と思うでしょうか？
前者なら書き直してください。あわせて、最初の1文がタイムラインで目を止める文になっているか、
${MAX_POST_LENGTH}文字（ハッシュタグ込み）を超えていないかを確認してください。

# 出力形式
- draft: 投稿案の本文。コピーしてそのまま使える1つの文章。ハッシュタグは含めない。
- hashtags: 投稿に添えるハッシュタグの配列（0〜3個程度、それぞれ # から始める。文字数に含まれる点に注意）
- warnings: 投稿前に人間が確認したほうがよい注意点があれば簡潔な日本語の配列で。特になければ空配列にする。
  （例: 実際の経験に置き換えてほしい箇所、企画より方針を優先して書き換えた点）`,

  buildUserPrompt: (ctx) => {
    const { draftInput, research, postPlan, revisionFeedback } = ctx.input;

    const revisionSection = revisionFeedback
      ? `

# ケンピンからの差し戻し（前回案の修正指示）
前回の投稿案はケンピンの確認で修正が必要と判断されました。以下の指摘を踏まえて書き直してください。

指摘事項:
${revisionFeedback.auditComments.map((comment) => `- ${comment}`).join('\n') || '- （指摘コメントなし）'}

修正案:
${revisionFeedback.suggestedChanges.map((change) => `- ${change}`).join('\n') || '- （具体的な修正案なし）'}`
      : '';

    return `${buildTeamContext(draftInput)}

# 企画担当が決めた方針
採用された切り口: ${postPlan.angle}
構成: ${postPlan.structure.join(' → ') || 'なし'}
投稿方針: ${postPlan.policy}

${buildResonanceSection(research)}

# リサーチ結果
読者の悩み: ${research.readerConcerns.join(' / ') || 'なし'}
読者が反応している言葉: ${research.keywords.join(' / ') || 'なし'}
経験を語れる論点: ${research.talkingPoints.join(' / ') || 'なし'}
事実確認が必要な内容: ${research.factsToVerify.join(' / ') || 'なし'}
使用してはいけない未確認情報: ${research.unverifiedClaimsToAvoid.join(' / ') || 'なし'}
Atlasを紹介できる接点: ${research.atlasConnectionIdeas.join(' / ') || 'なし'}
情報源: ${research.sources.join(' / ') || 'なし（一般論・体験談ベースとして扱う）'}
${revisionSection}

上記の条件で、Threads向けの投稿案を1つ作成してください。`;
  },

  jsonSchema: SOCIAL_DRAFT_JSON_SCHEMA,
  outputSchema: socialDraftOutputSchema,
};
