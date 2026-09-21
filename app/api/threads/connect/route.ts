import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { buildAuthorizeUrl } from '@/lib/threads/client';
import {
  getThreadsConfig,
  requestMatchesRedirectHost,
  THREADS_OAUTH_STATE_COOKIE,
} from '@/lib/threads/config';

// Threadsとの連携を開始する（運営のみ）。認可画面へ遷移させ、CSRF対策の state をCookieに保存する。
export async function GET(request: NextRequest) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json(
      { error: 'この操作は運営のみ実行できます。' },
      { status: 403 }
    );
  }

  const config = getThreadsConfig();

  if (!config) {
    return NextResponse.redirect(new URL('/ai/social?threads=not_configured', request.url));
  }

  // App ID が数字だけの形式でなければ、Metaに送っても「無効なclient_id」になる
  if (!config.appIdLooksValid) {
    return NextResponse.redirect(new URL('/ai/social?threads=invalid_app_id', request.url));
  }

  // MetaはHTTPSのリダイレクトURIしか受け付けない。認可画面に進む前に、分かりやすく止める
  if (!config.redirectUriIsSecure) {
    return NextResponse.redirect(new URL('/ai/social?threads=insecure_redirect', request.url));
  }

  // 連携を始めたサイトと、認可後の戻り先が違うと、戻ってきたときに確認Cookie・ログインがなく失敗する
  const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  if (!requestMatchesRedirectHost(config, requestHost)) {
    return NextResponse.redirect(new URL('/ai/social?threads=host_mismatch', request.url));
  }

  const state = randomBytes(24).toString('hex');

  const response = NextResponse.redirect(buildAuthorizeUrl(config, state));

  response.cookies.set(THREADS_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
    path: '/api/threads',
  });

  return response;
}
