# ユーザー削除仕様

Atlasのユーザー削除（本人退会・運営による削除）の設計。**設計のみで、実装・DB変更はまだ行っていない。**

## 目的

1. ユーザー本人が自分のアカウントを削除できる
2. 運営が問題ユーザーを削除できる
3. 必要に応じて、投稿・経験談などのコンテンツを残せる
4. `activity_logs` などの履歴を適切に扱う

## 決定事項

| 項目 | 決定 |
|---|---|
| 本人退会 | **完全削除（モードB）のみ。** A/Bを選ぶ画面は作らない |
| コンテンツを残す削除（モードA） | 運営だけが使える内部モードとして実装する |
| 猶予 | **30日。** 個人情報は削除した瞬間に消し、コンテンツは30日後に物理削除する。**取り消しはできない** |
| `users` の行 | 物理削除しない。個人情報を消した「墓標」として残す |
| `activity_logs` | IPアドレスを消し、`user_id` を外す。日時と操作種別だけ残す |
| `contacts`（お問い合わせ） | 氏名・メールは削除時に消す。本文は30日後に削除する |
| お問い合わせの保持期間（会員・非会員共通） | **対応完了（`resolved`）から1年。** 未完了のまま放置されたものは、最終更新から2年。基準は `updated_at`。日次ジョブで削除する。退会した会員のものは、上記にかかわらず30日後に削除する |
| 運営のメールボックスのお問い合わせメール | 運営が**受信から1年**で削除する（運用ルール。コードでは消せない）。退会しても短縮しない。ポリシーに明記する |
| DBバックアップ | ホスティング先はNeon。**復元用データは削除後も最大30日残りうる**ものとして扱い、ポリシーに明記する。運用ルールは「保持期間の運用ルール」を参照 |
| 課金（Stripe） | 未稼働のため対象外。課金を始める時点で解約処理を追加する |

## 用語

- **墓標（tombstone）**: 個人情報をすべて消し、`id` だけが残った `users` の行。他テーブルのFKを壊さないために残す。`id` だけでは個人を特定できない。
- **モードB（完全削除）**: 墓標化 ＋ コンテンツを非表示にし、30日後に物理削除する。
- **モードA（コンテンツを残す）**: 墓標化のみ。投稿は「退会したユーザー」名義で残る。

## 現状の問題（調査結果）

`users` を更新・削除する処理は [app/(login)/actions.ts](../app/(login)/actions.ts) の `deleteAccount` だけで、運営による削除機能はない。

1. **匿名化になっていない。** `deletedAt` を立てて email を `元のemail-id-deleted` に書き換えるだけ。元のメールアドレスが接頭辞に残り、`name` と `passwordHash` もそのまま。
2. **削除済みユーザーのニックネームが投稿に出続ける。** 次の4箇所が `leftJoin(users)` で `users.name` を出し、`deletedAt` を見ていない。
   - [app/(dashboard)/page.tsx](../app/(dashboard)/page.tsx)（experiences）
   - [app/experiences/[id]/page.tsx](../app/experiences/[id]/page.tsx)
   - [app/questions/[id]/page.tsx](../app/questions/[id]/page.tsx)（質問と回答の2箇所）
3. `users_name_active_unique` は `deletedAt IS NULL` の部分インデックスなので、退会後に別人が同じ名前を取れる。
4. **`signIn` が `deletedAt` を見ていない。** 今ログインできないのは、email を書き換えている副作用にすぎない。
5. `password_reset_tokens` は soft delete では消えない（CASCADE は物理削除でしか動かない）。
6. 本人のコンテンツ（質問・回答・経験談）は何も処理されず、そのまま公開され続ける。
7. `users` への外部キー（FK）はほぼすべて `ON DELETE NO ACTION` で、物理 `DELETE FROM users` は FK エラーになる。

## `users.id` を参照するFK一覧

| テーブル.カラム | NULL | onDelete |
|---|---|---|
| password_reset_tokens.user_id | NOT NULL | CASCADE |
| team_members.user_id | NOT NULL | NO ACTION |
| activity_logs.user_id | 可 | NO ACTION |
| questions.author_id | NOT NULL | NO ACTION |
| answers.author_id | NOT NULL | NO ACTION |
| experiences.author_id | NOT NULL | NO ACTION |
| invitations.invited_by | NOT NULL | NO ACTION |
| contacts.user_id | 可 | NO ACTION |
| contact_status_history.changed_by | NOT NULL | NO ACTION |
| social_workflows.created_by | NOT NULL | NO ACTION |
| social_workflows.approved_by | 可 | NO ACTION |
| management_meetings.created_by | NOT NULL | NO ACTION |
| threads_connections.connected_by | NOT NULL | NO ACTION |
| threads_kpi_reports.created_by | NOT NULL | NO ACTION |

間接的に関係するテーブル: `question_tags` / `experience_tags`（コンテンツの子、CASCADEなし）、`meeting_messages`（`management_meetings` からCASCADE）、`teams`（個人チームの名前が `${email}'s Team` でメールを含む）。

**FKは変更しない。** 墓標として `users` の行を残すので、NO ACTION のままで整合する。誤って `DELETE FROM users` を実行しても、参照があればFKエラーで止まる安全網にもなる。

## テーブル別の扱い

| テーブル | B. 完全削除（本人・運営） | A. コンテンツを残す（運営のみ） |
|---|---|---|
| **users** | 墓標化（下記） | 墓標化 |
| password_reset_tokens | DELETE | DELETE |
| team_members | DELETE | DELETE |
| teams | 最後の1人になったら、名前を `deleted-team-{id}` に変えて残す（Stripe項目はNULL）。行は消さない | 同左 |
| activity_logs | `user_id` を NULL、`ip_address` を NULL | 同左 |
| questions | `deletedAt` を設定 → 30日後にパージ | 残す |
| answers | `deletedAt` を設定 → 30日後にパージ | 残す |
| experiences | `deletedAt` を設定 → 30日後にパージ | 残す |
| question_tags / experience_tags | コンテンツのパージ時に先に削除 | 残す |
| invitations | 本人が送った招待をDELETE。本人のメール宛ての招待もDELETE | pending を `cancelled` にする。承諾済みは残す |
| contacts | `name` と `email` を匿名化。本文は30日後に削除 | 同左 |
| contact_status_history | contacts と一緒に30日後に削除 | 同左 |
| social_workflows / management_meetings / threads_connections / threads_kpi_reports | **触らない**（会社の運営データ）。墓標を参照したまま残す | 同左 |

### 墓標化の中身

| カラム | 値 |
|---|---|
| name | NULL（表示は「退会したユーザー」） |
| email | `deleted-{id}@deleted.invalid`（`id` を含めるので一意になる） |
| passwordHash | ランダム文字列から作った bcrypt ハッシュ（誰も知らないパスワード）。空文字や固定文字列にはしない |
| role | `member` |
| deletedAt | 現在時刻 |
| updatedAt | 現在時刻 |

### 個別のルール

- **ownerロールのユーザー（`isAdmin`）は、通常の削除経路で削除できない。** 先にroleを `member` に降格する手順を踏む。最後のownerの削除も拒否する。運営データ（`social_workflows` など）は墓標参照のまま残るので、付け替えは不要。
- **チームに他のメンバーがいる場合**（招待機能を使った場合）、削除者がそのチームの owner なら拒否して権限譲渡を促す。現状ほぼ発生しないが、`invitations` が残っているため防御として入れる。招待機能を実際に使っているかは実装時に確認する。
- **他の人が回答している質問を削除した場合**、スレッドごと非表示になる（回答ページが質問の `deletedAt` で絞るため）。30日後のパージでは、その質問への他人の回答も物理削除する（`answers.question_id` のFKを満たすため）。
- **`contacts.user_id` は残す。** 墓標には個人情報がないので、`user_id` が残っても誰の問い合わせか分からない。パージ時に「どの問い合わせを消すか」を `user_id` で引ける。
- **削除操作自体のログは `activity_logs` に残さない**（残すと `user_id` の紐づけが復活するため）。代わりに `account_deletions` に記録する。

## スキーマ変更案（未適用）

削除の記録とパージ予定を持つテーブルを1つ追加する。**`users` へのFKは張らない**（`users` の行が将来消えても記録が残るように）。

```ts
export const accountDeletions = pgTable('account_deletions', {
  id: serial('id').primaryKey(),

  // 削除されたユーザー（FKなし）
  userId: integer('user_id').notNull(),

  // 'full'（B）| 'keep_content'（A）
  mode: varchar('mode', { length: 20 }).notNull(),

  // 'self' | 'admin'
  actorType: varchar('actor_type', { length: 10 }).notNull(),

  // 運営が実行した場合の実行者（FKなし）
  actorId: integer('actor_id'),

  // 運営削除の理由（本人退会ではNULL）
  reason: text('reason'),

  // 運営削除で「再登録を拒否」を選んだ場合だけ保存する。
  // メールの HMAC-SHA256（鍵は AUTH_SECRET 由来）。本人退会では保存しない
  emailHash: varchar('email_hash', { length: 64 }),

  requestedAt: timestamp('requested_at').notNull().defaultNow(),

  // requestedAt + 30日
  purgeAfter: timestamp('purge_after').notNull(),

  // パージ完了日時。NULLならまだ
  purgedAt: timestamp('purged_at'),
});
```

パージ対象の検索用に、未完了の行だけの部分インデックスを張る。

```sql
CREATE INDEX "account_deletions_pending_idx"
  ON "account_deletions" ("purge_after")
  WHERE "purged_at" IS NULL;
```

これ以外のスキーマ変更は不要。マイグレーションは作成済み（下の「実装状況」を参照）。

## 処理フロー

共通関数 `deleteUser({ userId, mode, actor, reason })` を `lib/account/` に作り、本人退会と運営削除の両方から呼ぶ。**すべて1トランザクション。**

### 削除時

1. **ガード**: owner ロール、チームownerの譲渡、削除済みユーザーへの二重実行を拒否する。
2. **認証**: 本人退会はパスワード確認（現行どおり）。運営削除は運営権限の確認と、理由の入力を必須にする。
3. `account_deletions` に記録する（`purgeAfter = now + 30日`）。
4. `password_reset_tokens` を DELETE。
5. `invitations` を処理（表のとおり）。
6. `contacts` の `name` / `email` を匿名化する（email は NOT NULL なので `deleted@deleted.invalid`）。
7. `activity_logs` の `user_id` と `ip_address` を NULL にする。
8. `team_members` を DELETE。チームが空になったら、名前を `deleted-team-{id}` に変える。
9. （モードBのみ）`questions` / `answers` / `experiences` の `deletedAt` を設定する。
10. `users` を墓標化する。
11. （本人退会のみ）セッション cookie を削除して `/account/deleted` へ。

### 30日後のパージ（日次ジョブ。実装済み）

`purge_after <= now` かつ `purged_at IS NULL` の行ごとに、次の順で削除する（子テーブルが先）。

1. （モードBのみ）本人の質問に紐づく `question_tags` → その質問への `answers`（他人の回答を含む）→ 本人の `answers` → 本人の `questions`
2. （モードBのみ）`experience_tags` → `experiences`
3. `contact_status_history` → `contacts`（`user_id` が対象）
4. `purged_at` を設定する。

残すもの: `users` の行（墓標）、`activity_logs`、`teams`、`account_deletions` の記録、タグ本体。

- 実装: [lib/retention/account-deletions.ts](../lib/retention/account-deletions.ts)
- 削除記録1件ごとに別のトランザクションで実行する。1件が失敗しても他の記録に影響せず、失敗した記録は `purged_at` が入らないので、翌日のジョブで再実行される。
- 何度実行しても安全（期限前・実行済みの記録は何もしない）。
- 失敗があった場合、cron ルートは HTTP 500 を返す（Vercel のログで気づけるように）。

### 保持期間切れのお問い合わせの削除（実装済み）

退会とは無関係に、日次ジョブで次を削除する（`contact_status_history` を先に、`contacts` を後に。1トランザクション）。

- `status = 'resolved'` で、`updated_at` が1年より前のもの
- `status != 'resolved'` で、`updated_at` が2年より前のもの

`updated_at` は、対応完了にした日（`updateContactStatus`）に更新される。

### ジョブの構成

日次ジョブは1つのルート `/api/cron/purge-expired-data` にまとめ、Vercel Cron（`vercel.json`、毎日 03:00 JST）から呼ぶ。`CRON_SECRET` で保護する。次の2つを実行する（片方が失敗しても、もう片方は実行する）。

1. 退会から30日たったユーザーのデータのパージ（上記）
2. 保持期間を過ぎたお問い合わせの削除（下記）

- 実装: [app/api/cron/purge-expired-data/route.ts](../app/api/cron/purge-expired-data/route.ts)、[lib/retention/contacts.ts](../lib/retention/contacts.ts)、[lib/retention/account-deletions.ts](../lib/retention/account-deletions.ts)
- `?dryRun=1` を付けると、削除せず対象件数だけ返す。
- `CRON_SECRET` が未設定なら401を返し、何も削除しない。

### 運営削除の追加事項

- 削除画面で「再登録を拒否する」を選べるようにする。選ぶと `emailHash` を保存し、サインアップ時に照合する。
- 本人が退会した場合は `emailHash` を保存しない。同じメールで再登録できる（新しい `id` になり、旧アカウントとの紐づけはない）。
- 運営削除の対象を選ぶ管理画面は未実装。場所と形は別途決める。

## 表示側の変更

1. 上記4箇所の作者名を「`users.deletedAt` があるか `name` がNULLなら『退会したユーザー』」にする。共通のヘルパー関数にまとめる。
2. `signIn` のユーザー検索に `isNull(users.deletedAt)` を追加する。
3. アカウント削除画面に、下記の文言を出す。

## 保持期間のまとめ

| データ | 削除時 | 30日後 | それ以降 |
|---|---|---|---|
| 氏名・メール・パスワード | 消す | — | — |
| ログインセッション | 無効（`getUser` が `deletedAt` を見る） | — | — |
| 質問・回答・経験談（B） | 非表示 | 物理削除 | — |
| 質問・回答・経験談（A） | 残す | 残す | 残す（名義は「退会したユーザー」） |
| お問い合わせの氏名・メール | 消す | — | — |
| お問い合わせの本文・対応履歴（退会した会員） | 残す | 物理削除 | — |
| お問い合わせの本文・対応履歴（非会員・退会していない会員） | — | — | 対応完了から1年（未完了は最終更新から2年）で物理削除 |
| アクセス履歴の IP アドレス | 消す | — | — |
| アクセス履歴の日時・操作種別 | 残す（誰のものか分からない状態） | 残す | 残す |
| 削除の記録（`account_deletions`） | 作成 | 残す | 残す（個人情報なし。運営削除の再登録拒否用ハッシュのみ） |
| DBバックアップ（Neonの復元用データ） | 残る | 個人情報は最大30日で消える | 投稿は、パージ後さらに最大30日（退会から最大60日で完全に消える） |
| 運営のメールボックスのお問い合わせメール | 残る | 残る | 受信から1年で運営が削除 |
| メール配信サービス（Resend）の送信ログ | 残る | 残りうる | 最大30日（Freeプラン。公式の料金ページで確認） |

**DBの外に残るもの**
- お問い合わせは運営宛にメール送信している（[app/contact/actions.ts](../app/contact/actions.ts)）。氏名・メールアドレス・本文がそのまま入り、`replyTo` にも相手のメールアドレスが入る。運営が返信すれば、返信の中にも本文が残る。**メールボックスの中身は、退会でも消えない。**
- Resend にも送信ログが残る（Freeプランで30日。Freeプランを使っている。有料プランに変えるときは、保持日数を再確認する）。
- ホスティング（Vercel）のリクエストログにIPアドレスが残る可能性がある。

### 保持期間の運用ルール

**DBバックアップ（Neon）**
- 復元用の履歴の保持期間はプランで決まる（Free 6時間、Launch 最大7日、Scale 最大30日。公式ドキュメントで確認）。有料プランでは、別途スケジュールスナップショットも設定できる。
- 「最大30日」というポリシーの記載を守るため、**復元用履歴の保持期間を30日以内にし、30日を超えて残るスナップショットのスケジュールは作らない。** プランを変えたときは、この設定を見直す。
- 現在のプランと復元期間は、Neonのコンソール（Project settings）で確認する。コンソールにログインした記憶がない場合は、Freeプラン（復元用履歴6時間）のままとして扱ってよい。有料プランへの切替やスナップショットの設定は、自分で操作しないと行われないため（推測。ログインできた時点で確認する）。
- DBの接続先（`POSTGRES_URL`）は Neon（ap-southeast-1）。Neonのアカウントは、Vercel の Storage 画面（Vercel経由で作った場合）か、Neon のサイトで登録したメールアドレスでログインして探す。
- バックアップから復元するときは、既存のDBを上書きせず、別ブランチに復元して必要なデータだけ取り出す。削除済みユーザーの投稿や個人情報を、本番に戻さないため。

**運営のメールボックス（contact@atlas-community.jp）**
- 1年より古いお問い合わせメール（返信を含む）を、定期的（目安: 3か月に1回）に削除する。メールのサービスが検索に対応していれば、「受信から1年以上前」で絞り込んで一括削除する。
- 対象は、お問い合わせフォームの通知メールが届く `contact@atlas-community.jp` の受信箱と、そこから返信した送信済みメール。Gmail なら、検索欄に `older_than:1y` を入れて、全件選択して削除し、ゴミ箱も空にする。
- 退会した会員のメールも、この期間は残る。ポリシーにその旨を書く。

**代替案（採用しなかった）**: 通知メールの本文を「お問い合わせが届きました（種別・管理画面へのリンク）」だけにして、氏名・メール・本文をメールに載せない案。メールボックスとResendに個人情報が残らなくなるが、返信のたびに管理画面を開いて宛先をコピーする手間が増える。しかも運営が返信すれば、その返信にはどのみち本文が残る。運営の手間に見合わないため、現状のメールの形を維持して、削除の運用ルールで対応する。

## 削除確認画面の文言案

> アカウントを削除します。この操作は取り消せません。
>
> - お名前・メールアドレスなどのアカウント情報は、削除と同時に消去されます。
> - あなたが投稿した質問・回答・経験談は、削除と同時に非表示になり、30日後に完全に削除されます。
> - あなたの質問に他の方が回答している場合、その回答も一緒に見えなくなります。
> - お問い合わせの内容は、30日後に完全に削除されます。
> - 削除後30日間は、誤操作や問い合わせに対応するため、非表示の状態でデータを保持します。この間も、アカウントや投稿を元に戻すことはできません。
> - システムのバックアップには、削除後もデータが最大30日間残ることがあります。
> - お問い合わせをメールで受け取った運営のメールボックスには、最大1年間、内容が残ることがあります。
>
> 続けるには、パスワードを入力してください。

## プライバシーポリシーに書く内容（たたき台）

法的な文言は、公開前に専門家の確認を受けること。【 】は運用に合わせて決める箇所。

**退会・アカウント削除**
- 退会すると、氏名・メールアドレス・パスワードなどのアカウント情報を直ちに削除します。
- 投稿した質問・回答・経験談は、直ちに非表示にし、退会から30日後に完全に削除します。
- 30日間は、誤操作への対応と問い合わせ対応のため、非表示の状態で保持します。この間は復元できません。
- 障害に備えたバックアップには、削除後も最大30日間、データが残ることがあります。投稿は、退会から30日後の完全削除のあと、さらに最大30日で、バックアップからも消えます（退会から最大60日）。

**アクセス履歴**
- ログイン等の操作履歴（日時・操作種別）を、サービスの運営とセキュリティのために保存します。
- 記録するIPアドレスは、退会時に削除します。退会後は、履歴が誰のものか分からない状態で、日時と操作種別のみ保持します。

**お問い合わせ**
- お問い合わせの内容は、対応のために保存します。
- 会員の方が退会した場合、氏名・メールアドレスは直ちに削除し、本文は30日後に削除します。
- 会員でない方、および退会していない会員の方からのお問い合わせは、対応完了から1年後に削除します。対応が完了していないものは、最終更新から2年後に削除します。
- お問い合わせは、運営宛にメールでも送信されます。このメール（返信を含む）は、受信から1年後に運営が削除します。退会した場合も、運営のメールボックスには、この期間、内容が残ることがあります。
- お問い合わせの送信には、メール配信サービス（Resend）を利用しています。配信サービス側にも、送信内容が最大30日間記録されます。

**運営による削除**
- 利用規約に違反した場合、運営はアカウントを削除することがあります。
- 削除したアカウントの再登録を防ぐため、メールアドレスから作成した識別子（元のメールアドレスは復元できません）を保持することがあります。

## 未決事項

決定済み: 非会員のお問い合わせの保持期間（対応完了から1年）、運営メールボックスの運用（受信から1年で削除）、DBバックアップの扱い（最大30日として明記）。上の「決定事項」を参照。

**確認が必要なもの（運営の作業）**
1. **Neonのプランと復元期間**: コンソールにたどり着ければ、復元用履歴が30日以内で、30日を超えるスナップショットのスケジュールがないことを確認する。たどり着けない場合は、Freeプランのままとして扱う（「保持期間の運用ルール」を参照）。
2. ~~Resendのプラン~~: Freeプランと確認済み。送信ログは最大30日。
3. **Vercelの環境変数 `CRON_SECRET`**: 設定する（未設定だと、削除ジョブは401を返して何もしない）。
4. **運営メールボックスの削除の運用**: 3か月に1回など、実施の頻度と担当を決める。

**設計・実装で決めるもの**
5. 運営削除の管理画面の場所と形。
6. 招待機能（チームへの招待）を実際に使っているか。使っていなければチームownerの譲渡ガードは省ける。
7. 課金開始時: 削除フローに Stripe のサブスク解約と顧客情報の扱いを追加する。

## 実装状況

| 項目 | 状況 |
|---|---|
| 保持期間切れのお問い合わせの削除（日次ジョブ、`vercel.json`、`CRON_SECRET`） | **実装済み。未デプロイ・未実行。** dry-run で本番DBの対象件数を確認済み（0件） |
| 表示側の変更（作者名を「退会したユーザー」に）と `signIn` の `deletedAt` チェック | **実装済み。未コミット。** 現状の問題の2と4を塞ぐ。本番DBに退会済みユーザーがいない（会員3人、退会0人）ため、実データでの表示確認はまだできていない |
| `account_deletions` のマイグレーション（[0018_account_deletions.sql](../lib/db/migrations/0018_account_deletions.sql)） | **本番DBに適用済み**（2026-09-21。SQLを1トランザクションで直接実行）。テーブルと部分インデックスを確認済みで、行は0件。**`npm run db:migrate` は使わないこと**（下の注意を参照） |
| `deleteUser` 共通関数（[lib/account/delete-user.ts](../lib/account/delete-user.ts)） | **実装済み。どこからも呼んでいない。** 動作確認は [verify-account-deletion.ts](../lib/account/verify-account-deletion.ts)（後述） |
| 30日後のパージ（[lib/retention/account-deletions.ts](../lib/retention/account-deletions.ts)、日次ジョブに組み込み済み） | **実装済み。未デプロイ・本番では未実行。** 削除の記録がまだ0件なので、デプロイしても何も消えない |
| 本人退会（`deleteAccount` を `deleteUser` に差し替え、削除確認画面・削除完了画面の文言） | **実装済み。** [actions.ts](../app/(login)/actions.ts)、[security/page.tsx](../app/account/security/page.tsx)、[deleted/page.tsx](../app/account/deleted/page.tsx)。`deleteUser` 自体はロールバック付きで検証済み。`deleteAccount` を通した実際の退会（Cookie削除・リダイレクトを含む）は、本番DBに記録が残るため、まだ実行していない |
| それ以外（運営削除の画面、再登録拒否の照合、ポリシー） | 未着手 |

### 本人退会の画面

- 削除確認画面（`/account/security`）に、「削除確認画面の文言案」の内容を表示する。
- 確認ダイアログにも、「取り消せない」「投稿は30日後に完全に削除される」を入れている。
- 削除完了画面（`/account/deleted`）で、投稿を非表示にして30日後に完全に削除することを伝える。
- `deleteUser` が拒否した場合（運営アカウント、他のメンバーがいるチームのオーナー、課金情報が残るチーム）は、その理由を画面に表示する。
- 旧実装の「`activity_logs` に `DELETE_ACCOUNT` を記録する」処理はなくなった。`ActivityType.DELETE_ACCOUNT` は、過去のログの表示用に残してある。

### `deleteUser` の実装メモ

- `deleteUser(params)` は1トランザクションで実行する。本体の `deleteUserInTransaction(tx, params)` は、呼び出し側のトランザクション内で動く（テストで、実行後にロールバックするため）。
- 実行できない条件に当たったときは、例外ではなく `{ ok: false, code, message }` を返す。`code`: `invalid_request` / `forbidden` / `not_found` / `already_deleted` / `is_owner` / `team_owner_has_members` / `billing_attached`。書き込みは、すべてのガードを通ってから始める。
- 対象ユーザーの行を `FOR UPDATE` でロックし、同時実行による二重削除を防ぐ。
- 運営削除の権限（実行者が `owner` ロール）も、関数の中で確認する。呼び出し側の確認に頼らない。
- 本人による削除は完全削除のみ。「コンテンツを残す」と「再登録の拒否」は運営削除のみ。
- **仕様書の表から具体化した点**
  - 本人のメールアドレス宛ての招待は、A・Bどちらでも削除する（本人のメールアドレスが残らないようにするため）。
  - 課金情報（`stripeCustomerId` / `stripeSubscriptionId`）が残っているチームの最後の1人は、削除を拒否する（`billing_attached`）。課金は未稼働なので、現状は発生しない。
  - お問い合わせの `updated_at` は更新しない（保持期間の基準なので）。
- 削除操作のログは `activity_logs` に残さない。`account_deletions` に記録する。
- 再登録拒否の照合（サインアップ時に `email_hash` を確認する処理）は、まだ入れていない。運営削除の画面と一緒に入れる。

### 動作確認（ロールバック付き）

```bash
npx tsx lib/account/verify-account-deletion.ts
```

テストデータの作成から検証まで、すべて1つのトランザクションの中で行い、最後に必ずロールバックする。接続先のDBに行は残らない（`serial` の採番は進む）。次を確認している（108項目）。

- 本人退会（完全削除）: 墓標化、削除の記録、関連テーブルの処理、他のユーザーに触れていないこと、二重実行の拒否
- 運営削除（コンテンツを残す・再登録拒否）: コンテンツが残ること、招待の扱い、メールのHMAC
- ガード: 各拒否条件で、何も変わらないこと
- 他のメンバーがいるチームから、オーナーでないメンバーが抜けるケース
- パージ（完全削除）: 質問・回答（他人の回答を含む）・経験談・タグ・お問い合わせが消え、他人のデータ・墓標・アクセス履歴・チームが残ること。2回目は何もしないこと
- パージ（コンテンツを残す削除）: お問い合わせだけが消えること
- パージ（期限前）: 何も消えず、期限ちょうどで実行されること

cron ルート自体は、`?dryRun=1` で確認できる（認証なし・シークレット違い・未設定は401、正しいシークレットなら対象件数が返る）。

実行時は本番DBに接続する（`POSTGRES_URL`）。実行後に、テストデータが残っていないことも確認する。

### 注意: `npm run db:migrate` は使えない

本番DBの `drizzle.__drizzle_migrations` には、0002 までの3件しか記録がない。0003〜0017 は、この表に記録しない方法でスキーマに反映されている（テーブルは存在する）。`drizzle-kit migrate` は「最後に記録された時刻より新しいマイグレーション」を実行するので、今 `db:migrate` を流すと 0003 から再実行しようとして、既存のテーブルにぶつかって失敗する。

0018 も、同じ理由で SQL を直接実行して適用した。次のマイグレーションを作るときは、次のどちらかにする。

- 同じように、生成された SQL を直接実行する。
- 先に `__drizzle_migrations` に 0018 までの記録を足して、`db:migrate` を使えるようにする（記録は最新の1行でよい。`created_at` は `_journal.json` の `when`）。

## 実装順序

1. 表示側の変更（「退会したユーザー」表記）と `signIn` の `deletedAt` チェック。単独で先に入れられ、現状の問題の2と4を塞ぐ。
2. `account_deletions` のマイグレーション。
3. `deleteUser` 共通関数。
4. `deleteAccount` の差し替えと、削除確認画面の文言。
5. パージジョブ（Vercel Cron）。
6. 運営削除（管理画面）。
7. プライバシーポリシーの作成・公開。

## 動作確認の観点

- 削除直後: 旧メール・旧パスワードでログインできない。投稿が一覧・詳細・検索・マイページのどれにも出ない。
- 墓標: `name` / `email` / `passwordHash` に元の情報が残っていない。`deleted-{id}@deleted.invalid` が一意になっている。
- `activity_logs`: 対象ユーザーの行に `user_id` と `ip_address` が残っていない。
- 他人の回答がある質問を削除すると、スレッドごと非表示になる。
- 削除から30日経過した状態でパージを実行すると、コンテンツと `contacts` が消え、`purged_at` が入る。
- モードA: 投稿が「退会したユーザー」名義で残り、一覧・詳細に表示される。
- owner ロールのユーザーは削除を拒否される。
- 同じニックネームで別人が登録しても、旧投稿の表示が「退会したユーザー」のままである。
