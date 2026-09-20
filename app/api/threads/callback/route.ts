import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getMyProfile,
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

  const finish = (result: string) => {
    const response = NextResponse.redirect(
      new URL(`/ai/social?threads=${result}`, request.url)
    );
    response.cookies.delete({ name: THREADS_OAUTH_STATE_COOKIE, path: '/api/threads' });
    return response;
  };

  const config = getThreadsConfig();

  if (!config) return finish('not_configured');

  const params = request.nextUrl.searchParams;

  // ユーザーが認可を拒否した場合など
  if (params.get('error')) return finish('denied');

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
    console.error(
      'Threads connection failed:',
      error instanceof Error ? error.message : 'unknown error'
    );

    return finish('error');
  }
}
