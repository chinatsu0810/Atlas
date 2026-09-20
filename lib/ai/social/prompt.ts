import {
  EVIDENCE_LEVEL_LABELS,
  type GenerateSocialDraftInput,
  type ResearchResult,
} from './types';

// リサーチ・企画・執筆・検品・週次テーマ発見それぞれのシステムプロンプトは
// lib/ai/employees/social-*.ts（人格）と lib/ai/skills/thread-*.ts（作業指示）に
// 分離した。このファイルには、複数のSkillから共有される表示用の定数・
// ヘルパーのみ残す。

// トーンは、言葉の当て方の違い。どのトーンでも、ノウハウ中心の投稿にはしない
// （優先順位は 経験 > 共感 > 気づき > Atlasの思想 > ノウハウ）。
export const TONE_DESCRIPTIONS = `- 共感重視: 読者の気持ちに寄り添う言葉を中心にする
- 役立ち重視: 経験から得た気づきやヒントを、押しつけずに添える（手順やノウハウ中心にはしない）
- 親しみ重視: 柔らかく、距離が近い話し言葉にする
- 問いかけ重視: 読者への問いかけを多めにする`;

// リサーチ担当が見立てた「感情が動いているテーマ」（なぜ反応されたか・感情・Atlas視点・経験投稿につながる問い）。
// 古い投稿案など resonance がない場合は空文字を返す。
export function buildResonanceSection(research: ResearchResult): string {
  const { resonance } = research;

  if (!resonance) return '';

  return `# リサーチ担当が見立てた「感情が動いているテーマ」
根拠: ${EVIDENCE_LEVEL_LABELS[resonance.evidenceLevel]}（${resonance.evidenceNote}）
なぜ反応されたか: ${resonance.whyItResonated}
どんな感情があるか: ${resonance.emotions.join(' / ') || 'なし'}
Atlas視点の切り口: ${resonance.atlasAngle}
経験投稿につながる問い: ${resonance.experienceQuestions.join(' / ') || 'なし'}
${
  resonance.evidenceLevel === 'hypothesis'
    ? '※これはAIの見立て（仮説）です。投稿で「反応が多い」「話題になっている」など、見ていない事実として書かないでください。'
    : ''
}`;
}

export function buildTeamContext(input: GenerateSocialDraftInput): string {
  return `# 投稿テーマ
${input.topic}

# 想定読者
${input.audience}

# トーン
${input.tone}
${TONE_DESCRIPTIONS}

# Atlasの紹介について
${
  input.promoteAtlas
    ? 'この投稿には、Atlasの紹介を自然な形で含めます。'
    : 'この投稿にはAtlasの紹介を含めません。テーマに関する内容のみにします。'
}`;
}
