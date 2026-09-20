# Atlas SNS運用担当AI（Threads）

Atlasの認知拡大・利用促進を目的に、Threads向けの投稿案を作成するAIチーム。
リサーチ・企画・ライター・検品・分析の5役が連携し、最終判断は必ず人間が行う
（分析担当は現在スタブで、自動パイプラインには未組み込み）。

## 目的

Atlasは、海外赴任・帯同・移住・留学・海外での子育てなどの経験者に、リアルな体験談を聞ける海外生活のQ&A・体験談コミュニティサービス。
このAIチームは、Threads上で「本サービスの利用を自然に促す」投稿案を作成し、担当者の投稿作業を支援する。

## 対応SNS

- Threads のみ（初期版）

## 現在できること

- テーマ・想定読者・トーンを指定すると、リサーチャー→ライター→監査役の順にAIが連携して投稿案を作成する
- リサーチ結果（読者の悩み・関心キーワード・論点・要確認事項・情報源など）を画面上で確認できる
- 監査結果（合否・コメント・注意点・修正案）を画面上で確認できる
- 監査に合格した投稿案は、必ず「確認待ち（`pending_review`）」で停止する
- 監査で修正が必要と判定された場合、担当者の操作で再度ライターに書き直させる（「修正して再監査」）
- 担当者が投稿案を編集し、承認・却下できる
- 承認者・承認日時・更新日時を記録する
- Threadsへの手動投稿後、担当者の操作で「投稿済み」として記録する

## できないこと（初期版のスコープ外）

- Threadsへの自動投稿・予約投稿・Threads APIとの連携
- 人間の承認を経ない状態遷移（`pending_review` から先はすべて人間の操作が必須）
- 投稿の反応（いいね・返信・インプレッションなど）の自動収集・分析
- 複数投稿の一括生成やスレッド（連続投稿）形式の生成
- リサーチ担当によるThreadsの直接調査（Threads APIとの連携がないため、AIはThreadsを見られない。運営が入力した観測メモに基づくか、AIの見立て（仮説）として整理する）
- リサーチ担当による実際のWeb検索（情報源が明示できない内容は推測として扱う）

**投稿案は必ず人間が確認・承認してから、Threadsへ手動で投稿すること。**

## 今後の拡張候補

- リサーチ担当へのThreads連携（Threads APIによる、直近7日間の反応・コメントの取得）とWeb検索ツールの追加（実在の情報源を伴うリサーチ）
- 過去の投稿・反応実績を踏まえた改善提案
- 複数トーン・複数パターンの同時生成と比較
- スレッド形式（複数投稿の連続構成）への対応
- 他SNS（X、Instagramなど）への展開
- 投稿実績・反応の記録機能（`workflows.md` の「反応を記録」ステップの仕組み化）
- ワークフロー一覧・履歴の閲覧画面（現状は直近に作成した1件のみを画面に表示）

## 関連ドキュメント

- [role.md](./role.md) - 役割（リサーチャー・ライター・監査役）・担当業務の定義
- [guidelines.md](./guidelines.md) - 投稿文の作成方針・禁止事項
- [workflows.md](./workflows.md) - 運用フロー・状態遷移

## 実装

- 画面: `app/ai/social/page.tsx` + `app/ai/social/social-draft-form.tsx`（`/ai/social`、運営のみ利用可）
- API: `app/api/ai/social/route.ts`（`POST /api/ai/social` - リサーチ→企画→執筆→検品を実行し、ワークフローを作成する）
- Server Actions: `lib/ai/social/actions.ts`（再検品・承認・却下・投稿済み化。いずれも運営のみ実行可）
- Workflow: `lib/ai/workflows/social-post-pipeline.ts`（リサーチ→企画→執筆→検品）/ `social-weekly-batch.ts`（週次バッチ）。構造は [docs/ai/architecture.md](../architecture.md) を参照
- 記録役（DB保存）: `lib/ai/social/recorder.ts`
- 入力検証・エラークラス: `lib/ai/social/service.ts`
- 人格定義（Employee）: `lib/ai/employees/social-{researcher,planner,writer,editor,analyst}.ts`
- 作業指示（Skill）: `lib/ai/skills/thread-{research,planning,writing,quality-check,topic-planning}.ts`
- プロンプトの共有ヘルパー: `lib/ai/social/prompt.ts`
- 型・バリデーション: `lib/ai/social/types.ts`
- DB: `social_workflows` テーブル（`lib/db/schema.ts`）
