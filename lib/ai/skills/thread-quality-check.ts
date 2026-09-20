// 「検品」Skill：ライターが作成した投稿案を公開前に確認し、合否を判定する。
// 人格部分は lib/ai/employees/social-editor.ts。ライターの書き方の方針
// （thread-writing.ts）を守れているかも、ここで確認する。

import type { Skill } from '@/lib/ai/core/skill';
import {
  ATLAS_DESCRIPTION,
  ATLAS_PHILOSOPHY,
  BANNED_EXPRESSIONS,
} from '@/lib/ai/core/atlas-context';

import { buildResonanceSection, buildTeamContext } from '@/lib/ai/social/prompt';
import {
  countPostLength,
  MAX_POST_LENGTH,
  RECOMMENDED_POST_LENGTH_MAX,
  RECOMMENDED_POST_LENGTH_MIN,
} from '@/lib/ai/social/post-length';
import {
  auditResultSchema,
  type AuditResult,
  type GenerateSocialDraftInput,
  type ResearchResult,
  type SocialDraftOutput,
} from '@/lib/ai/social/types';

const AUDIT_RESULT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    approvedByAudit: { type: 'boolean' },
    auditStatus: { type: 'string', enum: ['pass', 'needs_revision'] },
    auditComments: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    suggestedChanges: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'approvedByAudit',
    'auditStatus',
    'auditComments',
    'warnings',
    'suggestedChanges',
  ],
  additionalProperties: false,
} as const;

export type ThreadQualityCheckInput = {
  draftInput: GenerateSocialDraftInput;
  research: ResearchResult;
  draftOutput: SocialDraftOutput;
};

export const threadQualityCheckSkill: Skill<ThreadQualityCheckInput, AuditResult> = {
  id: 'thread-quality-check',

  buildTaskInstructions: () => `ライターが作成したThreads投稿案を、公開前に確認することが仕事です。あなた自身は投稿案を書き直しません。
問題があれば指摘し、ライターに差し戻すための情報を整理してください。

# Atlasについて
${ATLAS_DESCRIPTION}

${ATLAS_PHILOSOPHY}

# 確認項目

## Atlasの方針に合っているか（ライターの書き方の方針）
- 経験・共感が中心か（ノウハウが中心になっていないか。優先順位は 経験 > 共感 > 気づき > Atlasの思想 > ノウハウ）
- 最初の1文で目を止める文になっているか（説明から始まっていないか。「〇〇について解説します」「〇〇のやること」のような書き出しは不可）
- 次のような投稿になっていないか: 手順解説 / チェックリスト / 網羅的説明 / マニュアル化 / AIっぽい整理された文章 / ブログ記事の要約 / 箇条書き中心の構成 / 制度説明だけの投稿
- 文字数: 推奨 ${RECOMMENDED_POST_LENGTH_MIN}〜${RECOMMENDED_POST_LENGTH_MAX}文字、上限 ${MAX_POST_LENGTH}文字（ハッシュタグ込み）。上限を超えていれば必ず差し戻す
- 読み終えた人が「なるほど」で終わらず、「知りたい」「聞きたい」「残したい」と思えるか。「なるほど」で終わる投稿は差し戻す
- 経験を残す価値（書く人の価値）が、押しつけがましくなく伝わるか

## 品質・リスク
- 誤字脱字がないか、読みやすいか
- 事実関係に問題がないか（リサーチ結果の sources ・factsToVerify ・unverifiedClaimsToAvoid と矛盾していないか）
- 未確認情報を断定していないか
- 誇張表現がないか
- 個人情報が含まれていないか
- 他者への誹謗中傷がないか、炎上しやすい表現・断定がないか
- Atlasの説明が正確か（実際の機能以上のことを述べていないか）
- 広告色が強すぎないか（宣伝だけの投稿になっていないか）
- リサーチ結果が「AIの見立て（仮説）」の場合、「反応が多い」「話題になっている」「共感が集まっている」など、
  見ていない事実を断定していないか
- 読者に誤解を与えないか
- 次のような断定的な表現が含まれていないか: ${BANNED_EXPRESSIONS.join('、')}

## 人間への注意喚起（warnings に必ず入れる）
- 投稿案が一人称の経験として書かれている場合、AIには実体験がないため、投稿前に人間が実際の経験や
  実在の声に置き換えるか、事実として問題がないかを確認する必要があること

# 出力形式
- approvedByAudit: 上記すべての観点で問題がなければ true、1つでも問題があれば false
- auditStatus: 問題がなければ "pass"、修正が必要なら "needs_revision"
- auditComments: 確認した内容・指摘事項（配列。問題がなくても確認した旨を1件以上入れる）
- warnings: 人間が投稿前に確認すべき注意点（配列。なければ空配列）
- suggestedChanges: needs_revision の場合、ライターへの具体的な修正案（配列。pass の場合は空配列でよい）

approvedByAudit と auditStatus は必ず整合させてください（approvedByAudit が false なら auditStatus は必ず "needs_revision"）。`,

  buildUserPrompt: (ctx) => {
    const { draftInput, research, draftOutput } = ctx.input;

    return `${buildTeamContext(draftInput)}

${buildResonanceSection(research)}

# リサーチ結果（参照用）
事実確認が必要な内容: ${research.factsToVerify.join(' / ') || 'なし'}
使用してはいけない未確認情報: ${research.unverifiedClaimsToAvoid.join(' / ') || 'なし'}
情報源: ${research.sources.join(' / ') || 'なし（一般論・体験談ベースとして扱う）'}

# 検品対象の投稿案
本文:
${draftOutput.draft}

ハッシュタグ: ${draftOutput.hashtags.join(' ') || 'なし'}

文字数（ハッシュタグ込み）: ${countPostLength(draftOutput.draft, draftOutput.hashtags)}文字（上限${MAX_POST_LENGTH}文字）

ライターからの注意点: ${draftOutput.warnings.join(' / ') || 'なし'}

上記の投稿案を確認項目に沿って検品してください。`;
  },

  jsonSchema: AUDIT_RESULT_JSON_SCHEMA,
  outputSchema: auditResultSchema,
};
