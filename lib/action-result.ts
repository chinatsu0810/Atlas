// 画面のボタンから呼ぶServer Actionの戻り値。
//
// 本番では、Server Actionが例外を投げると、Next.jsがメッセージを隠し
// 「An error occurred in the Server Components render…」という定型文に置き換えてしまい、
// 画面に失敗の理由を出せない。そのため、画面から呼ぶServer Actionは、
// 例外ではなく、この結果を返す（失敗の理由は error に入れる）。

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// 想定していない失敗（DBの障害など）の、画面に出す文言。詳細はサーバーのログに残す
export const UNEXPECTED_ERROR_MESSAGE =
  '予期しないエラーが発生しました。しばらくしてからもう一度お試しください。';
