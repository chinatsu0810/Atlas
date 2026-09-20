# AI社員の構造（Employee / Skill / Workflow）

AI社員は3層に分離する。目的は、社員の追加や組織変更があっても、既存の仕組みを大きく壊さずに拡張できること。

| 層 | 決めること | 置き場所 |
|---|---|---|
| Employee（社員） | 誰が仕事をするか（人格・役割） | `lib/ai/employees/` |
| Skill（スキル） | 何ができるか（再利用できる能力） | `lib/ai/skills/` |
| Workflow（ワークフロー） | 誰が・どの順で・どこで止まるか | `lib/ai/workflows/` |

依存の向きは **Workflow → Employee / Skill**（Workflowが社員とスキルを呼ぶ）の一方向のみ。
EmployeeとSkillは、Workflowを知らない。Skillは社員を知らない。Employeeはスキルを知らない。

## Employee

`lib/ai/core/employee.ts` の `Employee` 型は、次の5項目だけを持つ。

- 名前 / 役割 / 口調 / 目的 / 禁止事項

分析や処理のロジックは持たない。実行時に、人格としてシステムプロンプトの冒頭に組み込まれる。

## Skill

`lib/ai/core/skill.ts` の `Skill` 型は、Claudeへの作業指示・入力からのプロンプト生成・出力スキーマを持つ。
`runSkill(skill, employee, input)` が、社員の人格とスキルの作業指示を組み合わせて実行し、出力を検証して返す。

スキルは社員から独立して管理する。現在のスキル:

- 経営判断: `meeting-framing` / `why-analysis` / `decision-framework` / `risk-check` / `user-perspective` / `exit-criteria` / `proposal-drafting` / `proposal-review` / `meeting-summary`
- Threads: `thread-research` / `thread-topic-planning` / `thread-planning` / `thread-writing` / `thread-quality-check`
- 汎用: `fact-check`（現時点では、どのWorkflowにも組み込まれていない）/ `kpi-review`（KPIレビューWorkflowで使用）

## 社員とスキルの割り当て

`lib/ai/skill-assignments.ts` が、「どの社員がどのスキルを使えるか」を宣言する唯一の場所。
1人の社員が複数のスキルを持てる（例: 社長 = 案件整理 + 総括）。同じスキルを複数の社員が使ってもよい（例: `fact-check`）。

## Workflow

`lib/ai/workflows/` のWorkflowが、ステップ（社員 + スキル）を宣言し、実行順・分岐・人間の入力待ちを管理する。
社員どうしが直接会話することはなく、必ずWorkflowが1ステップずつ呼び出す。

- ステップは `defineStep(employee, skill)` で宣言する。割り当てのない組み合わせは、モジュール読み込み時にエラーになる。
- Workflowは、DBへの保存を「記録役」のインターフェース（`MeetingRecorder` / `SocialPostRecorder`）に委ねる。
  DBの構造は知らない。記録役の実装は `lib/ai/management/recorder.ts` / `lib/ai/social/recorder.ts`。
- 認証・入力検証・人間の承認フロー（承認・却下・投稿済み化）は、各機能の `actions.ts` が担う。

| Workflow | ファイル | 内容 |
|---|---|---|
| 経営判断会議 | `management-meeting.ts` | 案件整理 → 経営判断室の議論 → 会長への質問 → 一次案 → 監査室 → 総括 → 会長へ返却 |
| Threads投稿作成 | `social-post-pipeline.ts` | リサーチ → 企画 → 執筆 → 検品（投稿の検品・差し戻し後の再執筆を含む） |
| Threads週次バッチ | `social-weekly-batch.ts` | 週次のテーマを見立て、各テーマで投稿作成Workflowを実行 |
| KPIレビュー | `kpi-review.ts` | 分析担当が、与えられた数字を分析する。数字の入手は `lib/threads`（[Threads連携](./threads-integration.md)）が担う |

## 拡張のしかた

- **発言者・参加者を増やす／入れ替える**: Workflowのステップ宣言の並び（経営判断会議なら `DISCUSSION_STEPS`）を変更する。
- **社員を追加する**: `lib/ai/employees/` に定義を追加し、`lib/ai/employees/index.ts` に登録し、`skill-assignments.ts` でスキルを割り当てる。
- **スキルを追加する**: `lib/ai/skills/` に定義を追加し、`skill-assignments.ts` で使う社員に割り当てる。
- **新しいWorkflowを追加する**: `lib/ai/workflows/` にステップを宣言して進行を書き、記録役のインターフェースを定義する。

## 未実装

- 分析結果の蓄積: KPIレビューの結果は画面に表示するだけで、保存していない。
- Knowledge層（蓄積された知識の再利用）。
