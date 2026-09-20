// Threads APIの薄いクライアント（fetchのみ。DB・認証には依存しない）。
//
// アクセストークンはURLのクエリに含まれるため、エラーメッセージやログにURLを出さない
// （エラーはAPIが返したメッセージだけを使う）。

import {
  THREADS_AUTHORIZE_URL,
  THREADS_GRAPH_BASE,
  THREADS_OAUTH_BASE,
  THREADS_SCOPES,
  type ThreadsConfig,
} from './config';

export class ThreadsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    // Graph APIのエラーコード。190 = アクセストークンが無効・失効
    readonly code?: number
  ) {
    super(message);
  }

  get isInvalidToken(): boolean {
    return this.code === 190;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: number } })
    | null;

  if (!response.ok || body === null || body.error) {
    throw new ThreadsApiError(
      body?.error?.message ?? `Threads APIがエラーを返しました（HTTP ${response.status}）`,
      response.status,
      body?.error?.code
    );
  }

  return body;
}

// ============================================================
// OAuth
// ============================================================

export function buildAuthorizeUrl(config: ThreadsConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: THREADS_SCOPES.join(','),
    response_type: 'code',
    state,
  });

  return `${THREADS_AUTHORIZE_URL}?${params.toString()}`;
}

// 認可コード → 短期トークン（コードは1時間有効・1回限り）
export async function exchangeCodeForShortLivedToken(
  config: ThreadsConfig,
  code: string
): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    // Threadsは認可コードの末尾に「#_」を付けて返すことがある
    code: code.replace(/#_$/, ''),
  });

  const result = await request<{ access_token: string; user_id: number | string }>(
    `${THREADS_OAUTH_BASE}/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  );

  return { accessToken: result.access_token, userId: String(result.user_id) };
}

// 短期トークン → 長期トークン（60日）。アプリシークレットが必要なため、必ずサーバー側で行う
export async function exchangeForLongLivedToken(
  config: ThreadsConfig,
  shortLivedToken: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const params = new URLSearchParams({
    grant_type: 'th_exchange_token',
    client_secret: config.appSecret,
    access_token: shortLivedToken,
  });

  const result = await request<{ access_token: string; expires_in: number }>(
    `${THREADS_OAUTH_BASE}/access_token?${params.toString()}`
  );

  return { accessToken: result.access_token, expiresInSeconds: result.expires_in };
}

// 長期トークンの更新。発行から24時間以上たち、失効前のものだけが対象
// （60日更新しないと失効し、二度と更新できない）
export async function refreshLongLivedToken(
  token: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const params = new URLSearchParams({
    grant_type: 'th_refresh_token',
    access_token: token,
  });

  const result = await request<{ access_token: string; expires_in: number }>(
    `${THREADS_OAUTH_BASE}/refresh_access_token?${params.toString()}`
  );

  return { accessToken: result.access_token, expiresInSeconds: result.expires_in };
}

// ============================================================
// データ取得（自分のアカウント）
// ============================================================

export async function getMyProfile(
  token: string
): Promise<{ id: string; username: string | null }> {
  const params = new URLSearchParams({ fields: 'id,username', access_token: token });

  const result = await request<{ id: string; username?: string }>(
    `${THREADS_GRAPH_BASE}/me?${params.toString()}`
  );

  return { id: String(result.id), username: result.username ?? null };
}

export type ThreadsPost = {
  id: string;
  text: string;
  timestamp: Date;
  mediaType: string;
  permalink: string | null;
};

const MAX_POST_PAGES = 5;
const POSTS_PER_PAGE = 50;

// 指定期間の自分の投稿を新しい順に取得する。
// since/until を指定しても、念のため取得後に timestamp でも絞り込む。
export async function listMyThreads(
  token: string,
  range: { since: Date; until: Date }
): Promise<ThreadsPost[]> {
  const posts: ThreadsPost[] = [];

  let url: string | null = `${THREADS_GRAPH_BASE}/me/threads?${new URLSearchParams({
    fields: 'id,text,timestamp,media_type,permalink',
    since: String(Math.floor(range.since.getTime() / 1000)),
    until: String(Math.floor(range.until.getTime() / 1000)),
    limit: String(POSTS_PER_PAGE),
    access_token: token,
  }).toString()}`;

  for (let page = 0; page < MAX_POST_PAGES && url; page += 1) {
    const result: {
      data?: {
        id: string;
        text?: string;
        timestamp: string;
        media_type?: string;
        permalink?: string;
      }[];
      paging?: { next?: string };
    } = await request(url);

    for (const item of result.data ?? []) {
      const timestamp = new Date(item.timestamp);

      if (timestamp < range.since || timestamp > range.until) continue;

      posts.push({
        id: item.id,
        text: item.text ?? '',
        timestamp,
        mediaType: item.media_type ?? 'UNKNOWN',
        permalink: item.permalink ?? null,
      });
    }

    url = result.paging?.next ?? null;
  }

  return posts;
}

export const MEDIA_INSIGHT_METRICS = [
  'views',
  'likes',
  'replies',
  'reposts',
  'quotes',
  'shares',
] as const;

export type MediaInsightMetric = (typeof MEDIA_INSIGHT_METRICS)[number];

export type MediaInsights = Record<MediaInsightMetric, number>;

// 投稿ごとの数字（投稿から現在までの累計）。返らなかった指標は 0 として扱う
export async function getMediaInsights(
  token: string,
  mediaId: string
): Promise<MediaInsights> {
  const params = new URLSearchParams({
    metric: MEDIA_INSIGHT_METRICS.join(','),
    access_token: token,
  });

  const result = await request<{
    data?: { name: string; values?: { value: number }[] }[];
  }>(`${THREADS_GRAPH_BASE}/${encodeURIComponent(mediaId)}/insights?${params.toString()}`);

  const insights = Object.fromEntries(
    MEDIA_INSIGHT_METRICS.map((metric) => [metric, 0])
  ) as MediaInsights;

  for (const entry of result.data ?? []) {
    if ((MEDIA_INSIGHT_METRICS as readonly string[]).includes(entry.name)) {
      insights[entry.name as MediaInsightMetric] = entry.values?.[0]?.value ?? 0;
    }
  }

  return insights;
}

// フォロワー数（取得できなければ null。数字の分析の補助情報なので、失敗しても全体は止めない）
export async function getFollowersCount(
  token: string,
  userId: string
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      metric: 'followers_count',
      access_token: token,
    });

    const result = await request<{
      data?: { name: string; total_value?: { value: number } }[];
    }>(
      `${THREADS_GRAPH_BASE}/${encodeURIComponent(userId)}/threads_insights?${params.toString()}`
    );

    return (
      result.data?.find((entry) => entry.name === 'followers_count')?.total_value
        ?.value ?? null
    );
  } catch {
    return null;
  }
}
