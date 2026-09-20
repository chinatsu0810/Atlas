// Threadsアカウントとの連携（アクセストークンの保存・取得・更新）。
//
// 長期トークンは60日で失効し、失効後は更新できない。分析を実行するたびに、前回の更新から
// 一定日数がたっていれば自動で更新する（更新は発行から24時間以上たっている必要がある）。

import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { threadsConnections, type ThreadsConnectionRow } from '@/lib/db/schema';

import { refreshLongLivedToken, ThreadsApiError } from './client';
import { decryptToken, encryptToken } from './crypto';
import { ThreadsNotConnectedError } from './errors';

// 使うたびに更新すると無駄なので、この日数以上たっていれば更新する
const REFRESH_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getConnectionRow(): Promise<ThreadsConnectionRow | null> {
  const [row] = await db
    .select()
    .from(threadsConnections)
    .orderBy(desc(threadsConnections.updatedAt))
    .limit(1);

  return row ?? null;
}

// 連携を保存する。同じThreadsアカウントで再連携した場合は、既存の行を更新する
export async function saveConnection(params: {
  connectedBy: number;
  threadsUserId: string;
  username: string | null;
  accessToken: string;
  expiresInSeconds: number;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.expiresInSeconds * 1000);

  await db
    .insert(threadsConnections)
    .values({
      connectedBy: params.connectedBy,
      threadsUserId: params.threadsUserId,
      username: params.username,
      accessTokenEncrypted: encryptToken(params.accessToken),
      tokenRefreshedAt: now,
      tokenExpiresAt: expiresAt,
    })
    .onConflictDoUpdate({
      target: threadsConnections.threadsUserId,
      set: {
        connectedBy: params.connectedBy,
        username: params.username,
        accessTokenEncrypted: encryptToken(params.accessToken),
        tokenRefreshedAt: now,
        tokenExpiresAt: expiresAt,
        updatedAt: now,
      },
    });
}

export async function deleteConnection(): Promise<void> {
  await db.delete(threadsConnections);
}

/**
 * 使えるアクセストークンを返す。必要なら更新する。
 * 未連携・失効・復号できない場合は ThreadsNotConnectedError（再連携が必要）。
 */
export async function getAccessToken(): Promise<{
  token: string;
  threadsUserId: string;
  username: string | null;
}> {
  const row = await getConnectionRow();

  if (!row) {
    throw new ThreadsNotConnectedError('Threadsと連携されていません。');
  }

  const now = new Date();

  if (row.tokenExpiresAt <= now) {
    throw new ThreadsNotConnectedError(
      'Threadsのアクセストークンの有効期限が切れています。連携をやり直してください。'
    );
  }

  let token: string;

  try {
    token = decryptToken(row.accessTokenEncrypted);
  } catch {
    throw new ThreadsNotConnectedError(
      '保存されたアクセストークンを読み取れません（AUTH_SECRETが変更された可能性があります）。連携をやり直してください。'
    );
  }

  if (now.getTime() - row.tokenRefreshedAt.getTime() >= REFRESH_AFTER_DAYS * DAY_MS) {
    try {
      const refreshed = await refreshLongLivedToken(token);
      const refreshedAt = new Date();

      await db
        .update(threadsConnections)
        .set({
          accessTokenEncrypted: encryptToken(refreshed.accessToken),
          tokenRefreshedAt: refreshedAt,
          tokenExpiresAt: new Date(refreshedAt.getTime() + refreshed.expiresInSeconds * 1000),
          updatedAt: refreshedAt,
        })
        .where(eq(threadsConnections.id, row.id));

      token = refreshed.accessToken;
    } catch (error) {
      if (error instanceof ThreadsApiError && error.isInvalidToken) {
        throw new ThreadsNotConnectedError(
          'Threadsのアクセストークンが無効です。連携をやり直してください。'
        );
      }

      // 一時的な失敗なら、まだ有効な今のトークンで続行する（次回また更新を試みる）
      console.error('Threads token refresh failed:', error instanceof Error ? error.message : error);
    }
  }

  return { token, threadsUserId: row.threadsUserId, username: row.username };
}
