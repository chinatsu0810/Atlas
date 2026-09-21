import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getMyProfile,
  ThreadsApiError,
} from '@/lib/threads/client';
import { getThreadsConfig, THREADS_OAUTH_STATE_COOKIE } from '@/lib/threads/config';
import { saveConnection } from '@/lib/threads/connection';

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

// Threadsの認可後に戻ってくるURL（運営のみ）。認可コードを長期トークンに交換して保存する。
export async function GET(request: NextRequest) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json(
      { error: 'この操作は運営のみ実行できます。' },
      { status: 403 }
    );
  }

  // detail は、運営の画面に表示する失敗の理由（Metaが返したメッセージ。トークンやシークレットは含まれない）
  const finish = (result: string, detail?: string) => {
    const query = new URLSearchParams({ threads: result });

    if (detail) query.set('detail', detail.slice(0, 300));

    const response = NextResponse.redirect(
      new URL(`/ai/social?${query.toString()}`, request.url)
    );
    response.cookies.delete({ name: THREADS_OAUTH_STATE_COOKIE, path: '/api/threads' });
    return response;
  };

  const config = getThreadsConfig();

  if (!config) return finish('not_configured');

  const params = request.nextUrl.searchParams;

  // ユーザーが認可を拒否した場合など（Metaが理由を返していれば、それも画面に出す）
  if (params.get('error')) {
    return finish(
      'denied',
      params.get('error_description') ?? params.get('error_reason') ?? params.get('error') ?? undefined
    );
  }

  const code = params.get('code');
  const state = params.get('state');
  const savedState = request.cookies.get(THREADS_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || !safeEqual(state, savedState)) {
    return finish('state_error');
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(config, code);
    const longLived = await exchangeForLongLivedToken(config, shortLived.accessToken);
    const profile = await getMyProfile(longLived.accessToken);

    await saveConnection({
      connectedBy: user.id,
      threadsUserId: profile.id,
      username: profile.username,
      accessToken: longLived.accessToken,
      expiresInSeconds: longLived.expiresInSeconds,
    });

    return finish('connected');
  } catch (error) {
    // トークンを含む可能性のある情報をログに出さないよう、メッセージのみ記録する
    const message = error instanceof Error ? error.message : 'unknown error';

    console.error('Threads connection failed:', message);

    // Threads APIが返したメッセージだけを画面に出す（それ以外の内部エラーは、詳細を出さない）
    return finish(
      'error',
      error instanceof ThreadsApiError
        ? `${message}（コード: ${error.code ?? '不明'}、HTTP ${error.status}）`
        : undefined
    );
  }
}
