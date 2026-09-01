'use server';

import { z } from 'zod';
import { and, eq, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import { db } from '@/lib/db/drizzle';
import { passwordResetTokens, users } from '@/lib/db/schema';

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください。'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'パスワードが一致しません。',
    path: ['passwordConfirm'],
  });

export type ResetPasswordState =
  | {
      error: string;
      success?: undefined;
    }
  | {
      success: string;
      error?: undefined;
    };

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const result = resetPasswordSchema.safeParse({
    token: String(formData.get('token') || ''),
    password: String(formData.get('password') || ''),
    passwordConfirm: String(formData.get('passwordConfirm') || ''),
  });

  if (!result.success) {
    return {
      error:
        result.error.issues[0]?.message ??
        '入力内容を確認してください。',
    };
  }

  const { token, password } = result.data;

  const [resetToken] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!resetToken) {
    return {
      error:
        'パスワードリセットURLが無効、または有効期限が切れています。',
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db
  .update(users)
  .set({
    passwordHash: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, resetToken.userId));

  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, resetToken.id));

  return {
    success:
      'パスワードを変更しました。新しいパスワードでログインしてください。',
  };
}