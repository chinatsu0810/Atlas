import 'server-only';

import { cookies } from 'next/headers';

// ログイン不要のリアクション用に、閲覧者を区別する匿名ID。
// 初回リアクション時に発行し、httpOnly Cookie で保持する。
export const VISITOR_ID_COOKIE = 'atlas_visitor_id';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getVisitorId(): Promise<string | null> {
  const value = (await cookies()).get(VISITOR_ID_COOKIE)?.value;

  return value && UUID_PATTERN.test(value) ? value : null;
}

// Route Handler / Server Action からのみ呼べる（Cookieを書き込むため）
export async function getOrCreateVisitorId(): Promise<string> {
  const existing = await getVisitorId();

  if (existing) {
    return existing;
  }

  const visitorId = crypto.randomUUID();

  (await cookies()).set({
    name: VISITOR_ID_COOKIE,
    value: visitorId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });

  return visitorId;
}
