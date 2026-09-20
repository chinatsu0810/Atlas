# Threads API連携（分析担当）

運営のThreadsアカウントの直近の数字を取得し、分析担当（KPIレビューWorkflow）が分析する。
`/ai/social` の「Threads連携（分析担当）」パネルから使う。

## できること・できないこと

| | 内容 |
|---|---|
| できる | 自分のアカウントの投稿ごとの数字（閲覧・いいね・返信・リポスト・引用・シェア）と、フォロワー数の取得 |
| できない | 他人の公開投稿の反応数の取得（Threads APIが返さない）、話題のテーマの取得（該当するAPIが見当たらない） |
| しない | Threadsへの投稿（権限 `threads_content_publish` を要求しない。投稿は人間が手動で行う） |

他人の公開投稿を探す `keyword_search`（権限 `threads_keyword_search`、アプリ審査が必要）は、今回の連携には含めていない。
返るのは本文・URL・日時・ユーザー名までで、いいね数などの反応数は含まれない。
リサーチ担当の「観測メモ」の入力口（`observations`）は、将来この検索結果をつなぐための接続口として残してある。

## セットアップ

**MetaはHTTPSのコールバックURLしか受け付けない（`localhost` は登録できない）。**
そのため、連携は本番サイト（Vercel）で行う。コールバックURLは次のとおり。

```text
https://www.atlas-community.jp/api/threads/callback
```

1. [Meta for Developers](https://developers.facebook.com/) でアプリを作成し、**Threads use case** を追加する
2. 権限は `threads_basic` と `threads_manage_insights` を選ぶ
3. アプリの設定で「有効なOAuthリダイレクトURI」に、上のURLを登録する
4. 「Add or Remove Threads Test Users」で、運用するThreadsアカウントを **Threads Tester** にし、Threadsアプリ側で招待を承認する
5. **Vercelの環境変数**に、次を設定して再デプロイする
   - `THREADS_APP_ID` / `THREADS_APP_SECRET`（Metaのアプリの値）
   - `THREADS_REDIRECT_URI` = 上のURL（`BASE_URL` とは独立して指定できる。`www` の有無も含めて、Metaに登録した値と完全に一致させる）
   - `ANTHROPIC_API_KEY` / `AUTH_SECRET` / `POSTGRES_URL`（本番で未設定の場合）
6. **本番サイトに運営でログインし**、`https://www.atlas-community.jp/ai/social` の「Threadsと連携する」を押して認可する

### 連携は、コールバックURLと同じサイトから始める

状態確認用のCookieと、運営のログイン（セッション）のCookieは、ホストごとに別々に保持される。
`localhost` で連携を始めて本番のURLへ戻ると、戻ってきたときにどちらも失われて失敗する。
`atlas-community.jp`（`www` なし）から始めた場合も同様。連携は必ず `https://www.atlas-community.jp` から行う。
違うサイトから始めた場合は、認可画面に進む前に、その旨が画面に表示される。

### 本番にデプロイする前に確認すること

- **コードの反映**: Threads連携・AI社員・オフィス関連のコードが、Gitにコミットされ、Vercelがデプロイするブランチに
  反映されていること（未反映だと、本番にこの機能自体がない）
- **本番のデータベース**: 本番の `POSTGRES_URL` が指すDBに、次のテーブル・列があること。ローカルと同じDBなら対応済み
  - テーブル: `social_workflows`、`management_meetings`、`meeting_messages`、`threads_connections`
  - 列: `social_workflows.post_plan`
  - 別のDBの場合は、`lib/db/migrations/0014〜0016` のSQLを、本番のDBに適用する（`drizzle-kit migrate` は、このプロジェクトでは
    履歴が実態とずれているため使えない。SQLを直接実行する）
- **プレビュー環境**: Vercelのプレビュー用URLは毎回変わるため、Metaに登録できない。連携は本番URLでのみ行う

### ローカルでの開発について

ローカル（`http://localhost:3000`）では、Metaの認可を完了できない。ローカルで認可まで試したい場合は、
HTTPSのトンネル（ngrokなど）を使い、そのURLの `/api/threads/callback` を、Metaにも `THREADS_REDIRECT_URI` にも設定し、
**そのトンネルのURLでローカルのサイトを開いて**連携を始める（トンネルのURL上で、運営としてログインし直す必要がある）。
ローカルの他の機能（AI社員・会議など）は、連携なしで従来どおり使える。

## 仕組み

```text
認可（/api/threads/connect → Threadsの認可画面 → /api/threads/callback）
  → 認可コード → 短期トークン → 長期トークン（60日）→ 暗号化してDBへ保存（threads_connections）

「今週の数字を分析する」
  → lib/threads（数字の取得・集計）→ lib/ai/workflows/kpi-review.ts（分析担当 × kpi-review）
  → 良い傾向・懸念・仮説・改善の材料・データの限界（決定はしない）
```

- **比較の仕方**: 「直近7日間に投稿した分」と「その前の7日間に投稿した分」の、現在までの累計値。
  前の週の投稿は経過日数が長い分、数字が大きく出やすい（分析担当にも伝えている）。
- **トークンの更新**: 長期トークンは60日で失効し、**失効後は更新できない**。分析を実行するとき、前回の更新から7日以上
  たっていれば自動で更新する。60日以上使わないと失効するため、その場合は「再連携」が必要。
- **トークンの保管**: `AUTH_SECRET` から導出した鍵でAES-256-GCM暗号化して保存する。`AUTH_SECRET` を変更すると
  復号できなくなるので、連携をやり直す。
- **エラー**: Threads APIのエラーは、APIが返したメッセージだけを画面に出す（URLやトークンは出さない）。

## 未対応・確認が必要なこと

- MetaのThreads設定に、リダイレクトURI以外にアンインストール／削除のコールバックURLの入力欄がある場合、
  この実装にはそのエンドポイントがない（公式ドキュメントで必須かどうか確認できていない。必須と表示されたら追加する）
- 実際のThreadsアカウントでの動作は未確認（Metaアプリの作成が必要）。Threads APIの応答は、公式ドキュメントに基づく模擬で検証している。
- 分析結果は保存していない（画面に表示するだけ）。蓄積（Knowledge）は未実装。
- Metaの開発者ポリシー上、取得した数字の保存・AIでの処理にどんな条件があるか、運用前に確認すること。
