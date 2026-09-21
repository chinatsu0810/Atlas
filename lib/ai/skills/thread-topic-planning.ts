// 「週次テーマ発見」Skill：Atlasの読者の「感情が動いているテーマ」を見つけ、
// 今週のThreads投稿ラインナップ（テーマ・想定読者・中心の感情・なぜ反応されたか）として提案する。
// 現在はリサーチ担当が担当する。探すのは「役立つ情報」ではなく「人が語りたくなる経験」。
//
// Threadsの実データを取得する手段はない。運営が渡した観測メモ（observations）がある場合のみ、
// それに基づいて選べる。なければ、AIの知識と推論による見立て（仮説）になる。

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION, ATLAS_PHILOSOPHY } from '@/lib/ai/core/atlas-context';

import {
  SOCIAL_DRAFT_TONES,
  topicCandidateListSchema,
  type TopicCandidate,
} from '@/lib/ai/social/types';

const TOPIC_CANDIDATES_JSON_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          audience: { type: 'string' },
          tone: { type: 'string', enum: [...SOCIAL_DRAFT_TONES] },
          promoteAtlas: { type: 'boolean' },
          emotion: { type: 'string' },
          whyItResonated: { type: 'string' },
        },
        required: [
          'topic',
          'audience',
          'tone',
          'promoteAtlas',
          'emotion',
          'whyItResonated',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
} as const;

export type ThreadTopicPlanningInput = {
  count: number;
  recentTopics: string[];
  themeTags: string[];
  typeTags: string[];
  familyTags: string[];
  // 運営が集めたThreadsの観測メモ（任意）
  observations?: string;
  // 運営のThreadsアカウントの直近の分析の要約（任意。仮説を含む参考情報）
  analysisNote?: string;
};

type TopicCandidateList = { candidates: TopicCandidate[] };

export const threadTopicPlanningSkill: Skill<ThreadTopicPlanningInput, TopicCandidateList> = {
  id: 'thread-topic-planning',

  buildTaskInstructions: () => `今回は個別の投稿ではなく、今週のThreads投稿ラインナップの元になる
「感情が動いているテーマ」を見つけることを担当します。実際の投稿文は書きません（それはライターの仕事です）。

あなたは情報収集担当ではありません。Atlasの読者が、今なにに悩み、なにに共感し、なにに反応しているのかを
発見する担当です。探すのは「役立つ情報」ではなく、「人が語りたくなる経験」です。

# Atlasについて
${ATLAS_DESCRIPTION}

${ATLAS_PHILOSOPHY}

# 調査対象と期間
- 調査対象はThreadsで、基本は直近7日間です。その期間に、反応が多い・コメントが多い・共感が多い・
  議論が起きているテーマを探します。
- ただし、あなたにはThreadsを直接見る手段がありません。使えるのは、入力に「Threadsの観測メモ」として
  渡された内容だけです。
  - 観測メモがある場合: そこに書かれた反応・コメント・言葉に基づいてテーマを選んでください。
  - 観測メモがない場合: 実データに基づく選定はできません。一般的な知識と推論による「見立て（仮説）」であることを前提に、
    whyItResonated には「〜だと思われる」「〜の可能性がある」と仮説であることが分かる書き方をしてください。
    「反応が多い」「話題になっている」など、見ていない事実を断定しないでください。

# あなたの仕事
今週のThreads投稿として、読者の感情が動いていそうな「テーマ」と「想定読者」の組み合わせを、
指定された件数だけ提案してください。Atlasが実際に扱っている経験タイプ・家族構成・テーマのタグ一覧を踏まえ、
特定の切り口に偏らないよう多様性を持たせてください。

# 運営のThreads分析（参考情報）がある場合の扱い
- 入力に「運営のThreads分析」がある場合は、テーマ・トーン・切り口の多様性を考えるときの「参考」にしてよい
  （例: 体験を尋ねる形の投稿に返信が集まった、という仮説を、問いかけ重視のトーンを選ぶ参考にする）
- ただし、これはサンプルの小さい、自アカウントの仮説であり、事実ではない。指定件数のうち、分析に沿ったテーマは
  多くても半分程度にとどめ、残りは分析と関係なく、多様なテーマを選ぶこと（傾向に偏らせない）
- 分析の数字は、whyItResonated に書かない。whyItResonated は、Threadsの観測メモ（あれば）とAtlasの読者の感情に基づいて書く
- 選ぶ基準は、あくまで「感情が動いているテーマ」「人が語りたくなる経験」。分析は、その判断の補助にすぎない

# 良いテーマ（感情が動いている）
赴任するか迷った / 仕事を辞めた / 子どもへの説明 / 帯同の孤独 / 帰国後のキャリア / 現地で友達ができない /
日本が恋しい / 予想外だったこと / 後悔したこと / 一番助かった経験

# 悪いテーマ（検索で解決できる。選ばないこと）
ビザ取得方法 / 引越し手順 / 手続き一覧 / 必要書類 / 住民票の出し方
教育・仕事・住まい・ビザ・医療・お金・言語などの領域を扱う場合も、制度の説明ではなく、
「何が大変だったか」「何が意外だったか」「何を後悔したか」という経験・感情の側でテーマにしてください。

# 選び方の考え方
- 経験タイプ（駐在・帯同・移住・留学・ワーホリ・現地採用など）や家族構成（単身・夫婦・子連れ・妊娠中・ペットありなど）で、
  感情の中身が変わることを踏まえる
- 直近で扱ったテーマと重複しすぎないようにする（ユーザーメッセージの一覧を参照）
- 1件ごとに、テーマと想定読者はセットで具体的にする
- 「勉強になった」で終わるテーマではなく、読んだ人が「それ知りたい」「経験者に聞いてみたい」「私も経験を残したい」と
  思えるテーマを選ぶ

# 出力形式
- candidates: 指定件数ぶんの配列。各要素は次を持つ
  - topic: 投稿テーマ（具体的な一文）
  - audience: 想定読者（具体的な一文）
  - tone: "共感重視" | "役立ち重視" | "親しみ重視" | "問いかけ重視" のいずれか
  - promoteAtlas: Atlasの紹介を含める投稿にするかどうか（true/false。多様性のため一部はfalseにしてもよい）
  - emotion: このテーマの中心にある感情（具体的な言葉で）
  - whyItResonated: なぜ反応されたか（観測メモがある場合はその根拠、ない場合は仮説であることが分かる書き方で）`,

  buildUserPrompt: (ctx) => {
    const options = ctx.input;

    return `# 提案してほしい件数
${options.count}件

# Threadsの観測メモ（運営が集めた、直近の反応の様子）
${options.observations?.trim() || 'なし（Threadsの実データは渡されていません。見立て（仮説）として選んでください）'}

# Atlasが扱っている経験タイプ
${options.typeTags.join('、') || 'なし'}

# Atlasが扱っている家族構成
${options.familyTags.join('、') || 'なし'}

# Atlasが扱っているテーマ
${options.themeTags.join('、') || 'なし'}

# 直近で扱ったテーマ（重複を避けること）
${
  options.recentTopics.length > 0
    ? options.recentTopics.map((topic) => `- ${topic}`).join('\n')
    : 'なし'
}

${options.analysisNote?.trim() ? `# 運営のThreads分析（参考情報。仮説を含む）\n${options.analysisNote.trim()}\n\n` : ''}上記を踏まえて、今週のThreads投稿ラインナップを${options.count}件提案してください。`;
  },

  jsonSchema: TOPIC_CANDIDATES_JSON_SCHEMA,
  outputSchema: topicCandidateListSchema,
};
