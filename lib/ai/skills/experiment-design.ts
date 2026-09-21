// 「実験設計」Skill：議論で出た指摘・懸念を受け止め、致命度を見極め、小さく試せる実験に変換する。
// 実験推進担当（lib/ai/employees/experiment-driver.ts）が経営判断室の議論の最後に使う。
// 懸念を無視するのではなく、把握したうえで「実験できる最小単位」まで小さくする。
// 実行するかどうかの決定は行わない（会長が判断する）。

import type { Skill } from '@/lib/ai/core/skill';
import { ATLAS_DESCRIPTION, ATLAS_PHILOSOPHY } from '@/lib/ai/core/atlas-context';
import { buildDiscussionContext } from '@/lib/ai/management/prompt';
import {
  EXPERIMENT_SEVERITY_STOP,
  EXPERIMENT_SEVERITY_VERIFIABLE,
  experimentPlanSchema,
  type DiscussionContext,
  type ExperimentPlan,
} from '@/lib/ai/management/types';

const EXPERIMENT_PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    proposal: { type: 'string' },
    concerns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          concern: { type: 'string' },
          raisedBy: { type: 'string' },
          severity: {
            type: 'string',
            enum: [EXPERIMENT_SEVERITY_STOP, EXPERIMENT_SEVERITY_VERIFIABLE],
          },
          reason: { type: 'string' },
        },
        required: ['concern', 'raisedBy', 'severity', 'reason'],
        additionalProperties: false,
      },
    },
    minimalExperiment: { type: 'string' },
    duration: { type: 'string' },
    metrics: { type: 'array', items: { type: 'string' } },
    nextDecision: {
      type: 'object',
      properties: {
        continueIf: { type: 'string' },
        reviseIf: { type: 'string' },
        stopIf: { type: 'string' },
      },
      required: ['continueIf', 'reviseIf', 'stopIf'],
      additionalProperties: false,
    },
    questionsForOwner: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'proposal',
    'concerns',
    'minimalExperiment',
    'duration',
    'metrics',
    'nextDecision',
    'questionsForOwner',
  ],
  additionalProperties: false,
} as const;

export const experimentDesignSkill: Skill<DiscussionContext, ExperimentPlan> = {
  id: 'experiment-design',

  // 議論の全発言を読むため入力が長く、思考トークンも max_tokens に含まれる。
  // 既定の8192では出力が途中で切れたことがあるため、余裕を持たせる。
  maxTokens: 16000,

  buildTaskInstructions: () => `これまでの議論で出た指摘・懸念・リスクを受け止め、「小さく試せる実験」に変換して、
議論を「次に何をするか」まで進めることが仕事です。
問題点を無視するのではなく、問題点を把握したうえで、それでも小さく試せる形にしてください。
実行するかどうかの決定は行いません（最終判断は会長です）。実験の設計と判断条件の整理だけを行います。

# Atlasについて
${ATLAS_DESCRIPTION}

${ATLAS_PHILOSOPHY}

# 進め方
1. まず、他のメンバーの発言（反対意見・リスク・利用者視点の懸念・撤退条件・Atlasの理念とのズレなど）から
   主な指摘を拾って整理する。無視・軽視・反論で潰さない。指摘が実質的に出ていない場合は、concerns は空配列でよい
   （指摘を捏造しない）。
2. 各指摘について、次を見極めて致命度を付ける。
   - 「${EXPERIMENT_SEVERITY_STOP}」: 取り返しがつかない／利用者に実害（プライバシー・信頼・金銭・安全）が出る／
     Atlasの理念を根本から損なう／法令・規約に反する恐れがある、のいずれかに当たる問題。
     この種の問題は実験にせず、止める・先に解消することを明言する。
   - 「${EXPERIMENT_SEVERITY_VERIFIABLE}」: 上記に当たらず、小さく試して確かめられる問題。
   reason には、なぜその致命度なのか、今の段階で考える必要がある問題か、小さな実験で確認できるか、を書く。
3. 実験できない理由を探さず、実験できる最小単位まで小さくする。件数・日数・対象を絞り、戻せる形にする
   （例: 5件だけ、運営自身で、一部の対象だけ）。利用者の実際の反応・データを見る形を優先する。
   ただし、利用者に負担や不利益をかけてはいけない。
   「${EXPERIMENT_SEVERITY_STOP}」の指摘がある場合、その部分は実験にしない。実験できる範囲だけを切り出すか、
   実験自体を行わない理由を minimalExperiment に明記する。
4. 期間と、見る数字・反応を、実験の前に具体的に決める（測定できる形で）。
5. 続ける／修正する／やめる、の判断条件を、実験の前に数字や反応で書く。
   結果を見たあとで基準を都合よく動かせる書き方にしない。失敗は「失敗」ではなく判断材料として扱う。
6. 考えるより聞いたほうが早いこと（会長にしか答えられないこと）だけを questionsForOwner に整理する。

# 分量（簡潔に）
- concerns は、判断に効く主な指摘に絞って最大4件。似た指摘はまとめる
- concern と reason はそれぞれ一〜二文まで。minimalExperiment・duration・nextDecision の各項目も短く具体的に
- metrics は最大3件
- questionsForOwner は最大3件。会長にしか答えられず、実験の設計に不可欠なものだけに絞る（会長への質問が出ると会議が止まるため）
- 他のメンバーの発言を繰り返し引用・要約しない

# 出力形式
- proposal: 案。何をやるのか（一〜二文）
- concerns: 他のメンバーから出た主な指摘（配列。各要素は次を持つ）
  - concern: 指摘の内容
  - raisedBy: 誰の指摘か（社員名）
  - severity: 致命度（「${EXPERIMENT_SEVERITY_STOP}」または「${EXPERIMENT_SEVERITY_VERIFIABLE}」）
  - reason: その致命度と判断した理由
- minimalExperiment: 最小実験。最小限のコストで何を試すか
- duration: 期間。いつまで試すか
- metrics: 見る数字・反応（配列。何を見て判断するか）
- nextDecision: 次の判断
  - continueIf: 続ける条件
  - reviseIf: 修正する条件
  - stopIf: やめる条件
- questionsForOwner: 会長へ確認したいこと（配列。なければ空配列）`,

  buildUserPrompt: (ctx) => `${buildDiscussionContext(ctx.input)}

上記の発言を受けて、指摘を実験に変換してください。`,

  jsonSchema: EXPERIMENT_PLAN_JSON_SCHEMA,
  outputSchema: experimentPlanSchema,
};
