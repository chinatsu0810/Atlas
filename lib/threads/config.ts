// Threads API連携の設定。
//
// エンドポイントとバージョンは、Metaの公式ドキュメント
// （https://developers.facebook.com/docs/threads）の記載に合わせている。
// ホストが変わった場合は、この1か所だけを変更する。

export const THREADS_AUTHORIZE_URL = 'https://threads.com/oauth/authorize';

// OAuthのトークン交換・更新
export const THREADS_OAUTH_BASE = 'https://graph.threads.com';

// データ取得（投稿一覧・インサイトなど）
export const THREADS_GRAPH_BASE = 'https://graph.threads.net/v1.0';

// 自分のアカウントの投稿と数字を読むために必要な権限のみ。
// 投稿の公開（threads_content_publish）は、人間が手動で投稿する運用のため要求しない。
export const THREADS_SCOPES = ['threads_basic', 'threads_manage_insights'] as const;

export const THREADS_OAUTH_STATE_COOKIE = 'threads_oauth_state';

export type ThreadsConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  // MetaはHTTPSのリダイレクトURIしか受け付けない（localhostも不可）
  redirectUriIsSecure: boolean;
};

// 未設定の場合は null を返す（連携機能は「未設定」と表示するだけで、他の機能には影響しない）
export function getThreadsConfig(): ThreadsConfig | null {
  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;

  if (!appId || !appSecret) return null;

  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  // Metaのアプリ設定に登録した「有効なOAuthリダイレクトURI」と完全に一致させること。
  // 本番では、THREADS_REDIRECT_URI に本番のURL（https://…/api/threads/callback）を明示するのが確実
  // （BASE_URL は決済など他の機能でも使うため、それとは独立して指定できるようにしている）
  const redirectUri =
    process.env.THREADS_REDIRECT_URI?.trim() ||
    `${baseUrl.replace(/\/$/, '')}/api/threads/callback`;

  return {
    appId,
    appSecret,
    redirectUri,
    redirectUriIsSecure: redirectUri.startsWith('https://'),
  };
}

// 連携の開始（/api/threads/connect）と、認可後の戻り先（リダイレクトURI）は、同じホストでなければならない。
// 状態確認用のCookieと、運営のログイン（セッション）のCookieは、ホストごとに別々に保持されるため、
// 別のホスト（例: localhost で開始 → 本番へ戻る）だと、戻ってきたときに確認できず失敗する。
export function requestMatchesRedirectHost(
  config: ThreadsConfig,
  requestHost: string | null
): boolean {
  // ホストを判定できない場合は、止めずに通す
  if (!requestHost) return true;

  try {
    return new URL(config.redirectUri).host === requestHost.split(',')[0].trim();
  } catch {
    return false;
  }
}
