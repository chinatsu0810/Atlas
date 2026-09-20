# Atlas 経営判断室（会議システム）

Atlas運営全体の意思決定を支援するAI組織。会長（ユーザー本人）が案件を持ち込むと、
社長・経営判断室・監査室が連携して論点整理・情報収集・反対意見・ユーザー視点・
リスク確認を行う。**AIは最終判断を行わない。** 必ず会長の判断で会議を締めくくる。

## 目的

「AIが答えを決めること」ではなく、「会長が十分な情報をもとに、自分で考えて
意思決定できる環境を作ること」。AI社員は論点整理・情報収集・反対意見・
ユーザー視点・リスク確認などを担当し、最終判断は必ず会長が行う。

## 組織構造

- **会長（ユーザー）**: Atlasの最終責任者。理念を守り、軸を決め、最終判断を行う。AIではない。
- **社長**: 会議のファシリテーター。論点整理・進行管理・脱線防止・事実と仮説の整理・
  最終要約を行う。意思決定者ではない。
- **経営判断室**（5名）:
  - なぜなぜ上司: 原因を掘る、判断理由を明確化する、事実と推測を分ける（最大5段階程度）
  - 意思決定担当: 選択肢整理、メリット・デメリット整理、判断材料整理。一次案の取りまとめも担当
  - 反対意見担当: 前提を疑う、リスク確認、別解提示
  - ユーザー視点担当: 顧客・利用者視点からAtlas利用者にとっての価値を確認する
  - 撤退判断担当: 成功条件・撤退条件・評価期間の設定
- **監査室**: 経営判断室の一次案を監査する。KPI妥当性・前提確認・手段の目的化防止を確認し、
  問題があれば差し戻す（Threadsチームの検品担当とは別のAI社員）。

## 会議フロー

```text
① 会長が案件投入
↓
② 社長が案件整理（現状・課題・仮説・判断したいこと）
↓
③ 経営判断室が発言（5名が順番に発言。Employee同士は直接会話せず、
   直前までの発言をWorkflowがまとめて渡す）
↓
④ 会長への質問（判断に必要な情報が不足している場合のみ。なければ⑥へ）
↓
⑤ 追加議論（会長の回答を踏まえて再議論。往復回数の上限あり）
↓
⑥ 経営判断室の一次案作成（選択肢・メリット・リスク・判断材料・未確認事項。
   どれを選ぶべきかはAIが決定しない）
↓
⑦ 監査室レビュー（問題があれば⑥へ自動的に差し戻し。回数上限あり）
↓
⑧ 社長が総括（事実・仮説・論点・選択肢・リスク・未解決事項）
↓
⑨ 会長へ返却（必ず「会長、どう判断しますか？」で終える）
```

`awaiting_owner_input`（④）と `awaiting_owner_decision`（⑨）でのみ、会長の操作を
待って処理が停止する。それ以外の工程は会議作成・回答送信のリクエスト内で一気に実行される。

## できないこと（初期版のスコープ外）

- 会長への質問の往復は最大2ラウンドまで（上限に達した場合、残った質問は
  一次案の未確認事項として引き継ぎ、先へ進める）
- 監査室の差し戻しは最大1回まで自動でやり直す（上限に達した場合、監査室の指摘を
  総括に残したうえで先へ進める）
- 会議の議事録・意思決定内容をKnowledge（MDファイル等）へ蓄積する機能は未実装
- バーチャルオフィス（`/office`）では経営判断室5名をまとめて1つの状態として表示する
  （個別の発言内容は会議詳細画面で確認する）

## オフィス上での位置づけ

すべての業務はバーチャルオフィス（`/office`）の中で行う。オフィスのフロアは稼働のリズムの違う「部屋」で構成する。

| 部屋 | リズム | 内容 |
|---|---|---|
| 会議室（経営判断会議） | 随時 | 案件があるときに会長が会議を開く。開催中の会議の状況を表示し、会長の回答・判断が必要なときは強調表示する |
| Threads運用室 | 週次 | 週1回、今週分の投稿案をまとめて作成・確認する。今週分の作成状況と、確認待ち・要修正の件数を表示する |

## 関連ドキュメント

Threadsチーム（SNS運用）については [docs/ai/social/README.md](../social/README.md) を参照。

## 実装

- 画面（すべてバーチャルオフィス `/office` の中にある「会議室」。運営のみ利用可）:
  - `app/office/office-view.tsx`: オフィスフロア上の「会議室（随時）」パネル。開催中の会議の状況と入室ボタンを表示する
  - `app/office/meeting/page.tsx` + `meeting-list-and-form.tsx`（`/office/meeting`）: 出席者・会議一覧・案件投入
  - `app/office/meeting/[id]/page.tsx` + `meeting-view.tsx`（`/office/meeting/[id]`）: 会議詳細・質問回答・会長の判断記録
- API: `app/api/office/meeting/route.ts`（`POST /api/office/meeting` - 案件投入から社長整理・経営判断室の議論までを実行する）
- オフィス表示への接続: `lib/office/management-team.ts`（社員の状態と会議室の状況を、直近の会議から組み立てる）
- Server Actions: `lib/ai/management/actions.ts`（会議の進行制御。質問への回答・会長の判断記録・一覧取得。いずれも運営のみ実行可）
- Workflow: `lib/ai/workflows/management-meeting.ts`（会議の進行。誰が・どの順で・どこで止まるかを定義。構造は [docs/ai/architecture.md](../architecture.md) を参照）
- 記録役（DB保存）: `lib/ai/management/recorder.ts`
- 人格定義（Employee）: `lib/ai/employees/{president,why-analyst,decision-maker,contrarian,user-advocate,exit-planner,management-auditor}.ts`
- 作業指示（Skill）: `lib/ai/skills/{meeting-framing,why-analysis,decision-framework,risk-check,user-perspective,exit-criteria,proposal-drafting,proposal-review,meeting-summary}.ts`
- プロンプトの共有ヘルパー: `lib/ai/management/prompt.ts`
- 型・バリデーション: `lib/ai/management/types.ts`
- DB: `management_meetings` / `meeting_messages` テーブル（`lib/db/schema.ts`）
