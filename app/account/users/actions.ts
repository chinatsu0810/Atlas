'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { deleteUser } from '@/lib/account/delete-user';
import { isAdmin } from '@/lib/auth/permissions';
import { getUser } from '@/lib/db/queries';

export type AdminDeleteUserState = {
  error?: string;
};

const adminDeleteUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
  mode: z.enum(['full', 'keep_content'], {
    errorMap: () => ({ message: '削除の種類を選んでください。' }),
  }),
  reason: z
    .string()
    .trim()
    .min(1, '理由を入力してください。')
    .max(500, '理由は500文字以内で入力してください。'),
  // チェックボックス。チェックされたときだけ 'on' が送られる
  blockReRegistration: z.string().optional(),
  confirm: z.literal('削除', {
    errorMap: () => ({ message: '確認のため、「削除」と入力してください。' }),
  }),
});

// 運営によるユーザー削除。失敗の理由は、例外ではなく結果として返す
// （本番では例外の中身が画面に出ないため）。
export async function adminDeleteUser(
  _prevState: AdminDeleteUserState,
  formData: FormData
): Promise<AdminDeleteUserState> {
  const admin = await getUser();

  if (!admin || !(await isAdmin(admin.id))) {
    return { error: 'ユーザーを削除する権限がありません。' };
  }

  const parsed = adminDeleteUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { userId, mode, reason, blockReRegistration } = parsed.data;

  let result;

  try {
    result = await deleteUser({
      userId,
      mode,
      actor: { type: 'admin', id: admin.id },
      reason,
      blockReRegistration: blockReRegistration === 'on',
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return {
      error: 'ユーザーの削除に失敗しました。時間をおいてもう一度お試しください。',
    };
  }

  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath('/account/users');
  redirect(`/account/users?deleted=${userId}`);
}
