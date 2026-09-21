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
3. **リダイレクトURLを登録する**（詰まりやすい。下の「Metaの設定画面の注意点」を必ず読むこと）
   - 場所: ユースケース →「Threads APIにアクセス」の「カスタマイズ」→ 右メニューの「設定」
   - 「Redirect Callback URLs」に、上のURLを入れ、**入力欄の下に出る候補（ドロップダウン）をクリックして確定**してから保存する
   - 「Uninstall Callback URL」「Delete Callback URL」にも、**同じURLを入れる**（空だと保存できないことがある）
4. Threadsアカウントを **Threads Tester** にする（「App roles → Roles → Add People」）。そのうえで、**Threadsアプリ側で招待を承認する**
   （Threadsの「設定 → アカウント → ウェブサイトの許可（Website permissions）→ 招待（Invites）」）
5. **Vercelの環境変数**に、次を設定して再デプロイする
   - `THREADS_APP_ID` / `THREADS_APP_SECRET`: Metaダッシュボードの「App settings → Basic」にある **「Threads App ID」「Threads app secret」**。
     ページ上部の「App ID」「App secret」とは**別の値**なので、取り違えないこと（取り違えると、認可時に
     「URLはブロックされています: リダイレクトURIがアプリのクライアントOAuth設定で…」というエラーになりうる）
   - `THREADS_REDIRECT_URI` = 上のURL（`BASE_URL` とは独立して指定できる。`www` の有無も含めて、Metaに登録した値と完全に一致させる）
   - `ANTHROPIC_API_KEY` / `AUTH_SECRET` / `POSTGRES_URL`（本番で未設定の場合）
6. **本番サイトに運営でログインし**、`https://www.atlas-community.jp/ai/social` の「Threadsと連携する」を押して認可する

### Metaの設定画面の注意点

実際の設定で詰まった点。

- **リダイレクトURLは、入力しただけでは登録されない。** 入力欄の下に出る候補（ドロップダウン）を**クリックして確定**する。
  確定しないまま保存すると、「Redirect URIs: Please enter an OAuth redirect URI.」と出る、または、空のまま保存される
  （設定画面に何も表示されないのは、この状態）。ドロップダウンが出ないときは、最後の1文字を消して入力し直す、
  「↓」キーとEnterで確定する、別のブラウザ（拡張機能オフ）で開く、などを試す。
- **「Uninstall Callback URL」「Delete Callback URL」も、埋めないと保存できないことがある。** 使わなくても必須。
  現在は、リダイレクトURLと同じ値を入れて保存を通してある（Metaが実際に呼び出しても、Atlasは応答できない。下の「未対応」を参照）。
- **Threads Testerは、追加しただけでは足りない。** Threadsアプリ側で、招待を承認する。
- **「App ID」と「Threads App ID」は別の値。** 認可に使うのは、「App settings → Basic」の「Threads App ID」「Threads app secret」。

### 認可のときに出るエラーの意味

| エラー | 意味 | 確認すること |
|---|---|---|
| `error_code: 1349168`「URLはブロックされています: リダイレクトURIが…ホワイトリストに追加されていない」 | 送ったリダイレクトURLと、Metaに登録されたURLが一致しない（または、登録されていない） | 設定画面に、URLが**保存されて表示されている**か（ドロップダウンの確定）。`THREADS_REDIRECT_URI` の値（`www`・`https`・末尾の `/`）。連携パネルに表示されるURLと、Metaの登録が完全一致か |
| `error_code: 1`「An unknown error has occurred.」 | Metaが理由を隠している。スコープの区切りが空白（正しくはカンマ）でも出る。設定の不備（リダイレクトURL未登録、テスター未承認など）でも出た | Metaの認可画面を、Atlasを経由せず直接開いて切り分ける（下の「切り分けテスト」） |
| `Invalid client_id`（トークン交換時） | `THREADS_APP_ID` が、有効なThreadsアプリのIDでない | 「Threads App ID」を使っているか。空白・引用符が混ざっていないか |

### 切り分けテスト（Atlasを経由せず、Metaの設定だけを確認する）

`<Threads App ID>` を置き換えて、ブラウザで開く。同意画面が出れば、Meta側の設定は問題ない。

```text
https://threads.com/oauth/authorize?client_id=<Threads App ID>&redirect_uri=https%3A%2F%2Fwww.atlas-community.jp%2Fapi%2Fthreads%2Fcallback&scope=threads_basic&response_type=code
```

同意画面で「許可」を押すと、Atlasに戻り「連携の確認に失敗しました」と出る。このURLでは、Atlas側の確認情報がないためで、想定どおり。
また、Atlasの認可URLの `client_id` が有効なThreadsアプリのIDかは、Metaのトークン交換エンドポイントに、シークレットなしの
偽のコードを送り、返るエラーが「Invalid client_id」か、それ以外（例: 「Invalid verification code」）かで確認できる。

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
- **分析担当に渡す情報**: 集計した指標の表に加えて、今週の投稿の一覧（投稿日時＝日本時間、冒頭40字、文字数、閲覧・いいね・返信・
  リポスト・引用。新しい順で最大40件）と、「反応が1件以上あった投稿の数」（今週・前回）を渡す。件数はこちらで数えて渡し、
  一覧の一部から分析担当に推測させない。前回の投稿は、件数と合計値のみ（一覧は渡さない）。
  Threads APIで取得できない指標（保存数・プロフィールへのアクセス数）は、指標として挙げないよう指示している。
- **トークンの更新**: 長期トークンは60日で失効し、**失効後は更新できない**。分析を実行するとき、前回の更新から7日以上
  たっていれば自動で更新する。60日以上使わないと失効するため、その場合は「再連携」が必要。
- **トークンの保管**: `AUTH_SECRET` から導出した鍵でAES-256-GCM暗号化して保存する。`AUTH_SECRET` を変更すると
  復号できなくなるので、連携をやり直す。
- **エラー**: Threads APIのエラーは、APIが返したメッセージだけを画面に出す（URLやトークンは出さない）。

## 未対応・確認が必要なこと

- **認証解除・削除のコールバックの受け口がない。** 「Uninstall Callback URL」「Delete Callback URL」には、保存を通すため、
  リダイレクトURL（`/api/threads/callback`）と同じ値を入れてある。ユーザーがThreads側でアプリの連携を解除する、または
  データ削除を求めると、MetaがそのURLにPOSTするが、Atlasは応答できず（405）、保存済みのトークンも削除されない
  （手動で「連携を解除」すれば削除できる）。専用の受け口（署名付きリクエストの検証、トークンの削除、削除リクエストへの応答）の実装が望ましい。
- 連携（認可）は、実際のThreadsアカウントで成功したことを確認した（トークンは暗号化してDBに保存され、有効期限は約60日）。
  一方、「今週の数字を分析する」（インサイトの取得と分析）は、Threads APIの応答を、公式ドキュメントに基づく模擬で検証したのみ。実際のアカウントでの結果は、運用しながら確認する。
- 分析結果は保存していない（画面に表示するだけ）。蓄積（Knowledge）は未実装。
- Metaの開発者ポリシー上、取得した数字の保存・AIでの処理にどんな条件があるか、運用前に確認すること。
