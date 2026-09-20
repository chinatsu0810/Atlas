// 「リサーチ」Skill：指定されたテーマについて、読者の感情が動いている理由と、
// 経験投稿につながる問いを整理する。情報収集ではなく、「人が語りたくなる経験」を見つけるのが目的。
// 人格は lib/ai/employees/social-researcher.ts、書き方の方針は thread-writing.ts と揃える。
//
// Threadsの実データを取得する手段はない。運営が渡した観測メモ（input.observations）がある場合のみ
// 「観測に基づく」と書ける。なければ、AIの見立て（仮説）として書かせる
// （Workflow側でも、メモがなければ仮説に固定する）。

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION, ATLAS_PHILOSOPHY } from '@/lib/ai/core/atlas-context';

import { buildTeamContext } from '@/lib/ai/social/prompt';
import {
  EVIDENCE_LEVELS,
  researchResultSchema,
  type GenerateSocialDraftInput,
  type ResearchResult,
} from '@/lib/ai/social/types';

const RESEARCH_RESULT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    readerConcerns: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    talkingPoints: { type: 'array', items: { type: 'string' } },
    factsToVerify: { type: 'array', items: { type: 'string' } },
    unverifiedClaimsToAvoid: { type: 'array', items: { type: 'string' } },
    atlasConnectionIdeas: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    resonance: {
      type: 'object',
      properties: {
        whyItResonated: { type: 'string' },
        emotions: { type: 'array', items: { type: 'string' } },
        atlasAngle: { type: 'string' },
        experienceQuestions: { type: 'array', items: { type: 'string' } },
        evidenceLevel: { type: 'string', enum: [...EVIDENCE_LEVELS] },
        evidenceNote: { type: 'string' },
      },
      required: [
        'whyItResonated',
        'emotions',
        'atlasAngle',
        'experienceQuestions',
        'evidenceLevel',
        'evidenceNote',
      ],
      additionalProperties: false,
    },
  },
  required: [
    'readerConcerns',
    'keywords',
    'talkingPoints',
    'factsToVerify',
    'unverifiedClaimsToAvoid',
    'atlasConnectionIdeas',
    'sources',
    'resonance',
  ],
  additionalProperties: false,
} as const;

export const threadResearchSkill: Skill<GenerateSocialDraftInput, ResearchResult> = {
  id: 'thread-research',

  buildTaskInstructions: () => `あなたは情報収集担当ではありません。
Atlasの読者が、今なにに悩み、なにに共感し、なにに反応しているのかを発見する担当です。
ライターへ渡すのは情報ではなく、「感情が動いているテーマ」です。

# Atlasとは
${ATLAS_DESCRIPTION}

${ATLAS_PHILOSOPHY}

# 最重要
「役立つ情報」を探さないこと。「人が語りたくなる経験」を探してください。
探すのは情報ではなく、感情です。Atlasが蓄積したいのは、情報ではなく経験です。

# 調査対象と期間
- 調査対象はThreadsです。Atlasは、検索で見つかる情報だけを扱うサービスではありません。
- 基本は直近7日間。その期間に、反応が多い・コメントが多い・共感が多い・議論が起きているテーマを探します。
- ただし、あなたにはThreadsを直接見る手段がありません。使えるのは、入力に「Threadsの観測メモ」として
  渡された内容だけです。

# 観測メモの扱い（見ていない反応を、あったことにしない）
- 「Threadsの観測メモ」がある場合: メモに書かれている反応・コメント・言葉に基づいて整理してください。
  この場合のみ evidenceLevel を "observed" にでき、evidenceNote に根拠（メモのどの部分か）を書きます。
- 観測メモがない場合: 実データに基づく整理はできません。読者の感情についての「見立て（仮説）」として整理し、
  evidenceLevel を "hypothesis" にしてください。evidenceNote には
  「Threadsの実データは渡されていないため、AIの見立て（仮説）です」と明記します。
  「反応が多い」「話題になっている」「共感が集まっている」など、見ていない事実を断定しないでください。
- 観測メモに個人を特定できる情報が含まれていても、出力には引用・転記しないでください。

# 良いテーマ（感情が動いている）
赴任するか迷った / 仕事を辞めた / 子どもへの説明 / 帯同の孤独 / 帰国後のキャリア / 現地で友達ができない /
日本が恋しい / 予想外だったこと / 後悔したこと / 一番助かった経験

# 悪いテーマ（検索で解決できる）
ビザ取得方法 / 引越し手順 / 手続き一覧 / 必要書類 / 住民票の出し方
入力されたテーマがこうした情報寄りの場合は、そのテーマの奥にある感情・経験の側に寄せて整理してください。

# あなたの仕事
入力されたテーマ・想定読者について、次の観点で整理してください（提出形式）。
- テーマ: 入力されたテーマ
- なぜ反応されたか（whyItResonated）: 読者の感情が動く理由
- どんな感情があるか（emotions）: 具体的な言葉で
- Atlas視点の切り口（atlasAngle）: 経験には価値がある、経験を残す意味がある、経験者に聞く価値がある、という視点でどう語れるか
- 経験投稿につながる問い（experienceQuestions）: 「あなたはどうでしたか？」と聞きたくなる、経験を語りたくなる問い

# 出力形式
- readerConcerns: 読者が今悩んでいること（配列。制度・手続きの疑問ではなく、気持ちや状況の悩み）
- keywords: 読者が反応している言葉・言い回し（配列。検索キーワードではなく、感情のこもった言葉）
- talkingPoints: 経験を語れる論点（配列。手順や情報ではなく、実際に困ったこと・意外だったこと・後悔・助かった経験など）
- factsToVerify: 投稿に含める場合、人間による事実確認が必要な内容（配列。なければ空配列）
- unverifiedClaimsToAvoid: 裏付けのない情報で、投稿に使ってはいけない内容（配列。なければ空配列）
- atlasConnectionIdeas: Atlasを自然に紹介できそうな接点（配列）
- sources: 実在する情報を根拠にした場合、その情報源（配列）。具体的な情報源を示せない場合は空配列にし、
  該当する内容は憶測・一般論として扱い、factsToVerify または unverifiedClaimsToAvoid 側に分類してください。
- resonance: 上記「提出形式」の whyItResonated / emotions / atlasAngle / experienceQuestions と、
  evidenceLevel / evidenceNote（根拠。観測メモの扱いに従うこと）`,

  buildUserPrompt: (ctx) => {
    const { observations, themeNote } = ctx.input;

    const observationSection = observations?.trim()
      ? observations.trim()
      : 'なし（Threadsの実データは渡されていません。evidenceLevel は "hypothesis" にしてください）';

    return `${buildTeamContext(ctx.input)}

# Threadsの観測メモ（運営が集めた、直近の反応の様子）
${observationSection}

# テーマ選定時のメモ（あれば）
${themeNote?.trim() || 'なし'}

上記のテーマについて、感情が動いている理由と、経験投稿につながる問いを整理してください。`;
  },

  jsonSchema: RESEARCH_RESULT_JSON_SCHEMA,
  outputSchema: researchResultSchema,
};
