'use server';

import { randomBytes } from 'crypto';
import { z } from 'zod';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  passwordResetTokens,
  users,
} from '@/lib/db/schema';

type ResetState = {
  error?: string;
  success?: string;
};

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('メールアドレスの形式が正しくありません'),
});

export async function requestPasswordReset(
  _state: ResetState,
  formData: FormData
): Promise<ResetState> {
  const result = forgotPasswordSchema.safeParse({
    email: String(formData.get('email') || '')
      .trim()
      .toLowerCase(),
  });

  if (!result.success) {
    return {
      error:
        result.error.issues[0]?.message ??
        '入力内容を確認してください。',
    };
  }

  const { email } = result.data;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        eq(users.email, email),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  /*
   * セキュリティ上、
   * 登録されていないメールアドレスでも
   * 同じ成功メッセージを返します。
   */
  if (!user) {
    return {
      success:
        '入力されたメールアドレスに、パスワードリセットのご案内を送信しました。',
    };
  }

  // 既存の有効なトークンを削除
  await db
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    );

  // 32バイトのランダムトークン
  const token = randomBytes(32).toString('hex');

  // 1時間有効
  const expiresAt = new Date(
    Date.now() + 60 * 60 * 1000
  );

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  
  /*
   * 現段階ではメール送信はまだ行いません。
   * 開発中はターミナルでURLを確認できるようにします。
   */
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  const resetUrl =
    `${baseUrl}/reset-password?token=${token}`;

  console.log('========================================');
  console.log('PASSWORD RESET URL');
  console.log(resetUrl);
  console.log('========================================');

  return {
    success:
      '入力されたメールアドレスに、パスワードリセットのご案内を送信しました。',
  };
}