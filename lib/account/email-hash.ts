import { createHmac } from 'node:crypto';

// 運営削除で「再登録を拒否」を選んだときに保存する、メールアドレスの識別子。
// HMAC-SHA256（鍵は AUTH_SECRET 由来）なので、元のメールアドレスは復元できない。
// 仕様は docs/account-deletion.md を参照。
export function hashEmailForBlocklist(email: string): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }

  return createHmac('sha256', `email-blocklist:${secret}`)
    .update(email.trim().toLowerCase())
    .digest('hex');
}
