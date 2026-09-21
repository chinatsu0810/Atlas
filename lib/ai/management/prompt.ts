import type { DiscussionContext } from './types';

// 経営判断室の6名（ナゼ・ヒカク・ギモン・リヨウシャ・テッタイ・スイシン）が
// 共通して参照する、会議のコンテキスト部分。Employee同士が直接会話しない設計のため、
// Workflowがこれまでの発言を「まとめて」各Employeeに渡す。

export function buildDiscussionContext(ctx: DiscussionContext): string {
  const priorSection =
    ctx.priorStatements.length > 0
      ? ctx.priorStatements
          .map(
            (statement) =>
              `## ${statement.employeeName}（${statement.employeeRole}）の発言\n${JSON.stringify(statement.content)}`
          )
          .join('\n\n')
      : 'まだ他の発言はありません。';

  const ownerAnswerSection =
    ctx.ownerAnswers.length > 0
      ? ctx.ownerAnswers
          .map((qa) => `- 質問: ${qa.question}\n  会長の回答: ${qa.answer}`)
          .join('\n')
      : 'まだありません。';

  return `# 案件
${ctx.topic}

# 社長による整理
現状: ${ctx.framing.currentSituation}
課題: ${ctx.framing.issues.join(' / ') || 'なし'}
仮説: ${ctx.framing.hypotheses.join(' / ') || 'なし'}
判断したいこと: ${ctx.framing.decisionPoints.join(' / ') || 'なし'}

# これまでの発言
${priorSection}

# 会長への質問と回答（あれば）
${ownerAnswerSection}`;
}
