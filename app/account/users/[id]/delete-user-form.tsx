'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  adminDeleteUser,
  type AdminDeleteUserState,
} from '../actions';

const fieldClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200';

export function DeleteUserForm({ userId }: { userId: number }) {
  const [state, formAction, isPending] = useActionState<
    AdminDeleteUserState,
    FormData
  >(adminDeleteUser, {});

  return (
    <form action={formAction} className="mt-4 space-y-6">
      <input type="hidden" name="userId" value={userId} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">削除の種類</legend>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
            <input
              type="radio"
              name="mode"
              value="full"
              defaultChecked
              className="mt-1"
            />
            <span>
              <span className="font-medium">完全削除</span>
              <span className="mt-1 block text-muted-foreground">
                名前・メールアドレスなどを消去し、投稿した質問・回答・経験談は非表示にして、30日後に完全に削除します。
                このユーザーの質問に他の人が付けた回答も、一緒に見えなくなり、削除されます。
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-red-300 has-[:checked]:bg-red-50">
            <input
              type="radio"
              name="mode"
              value="keep_content"
              className="mt-1"
            />
            <span>
              <span className="font-medium">コンテンツを残して削除</span>
              <span className="mt-1 block text-muted-foreground">
                名前・メールアドレスなどを消去し、投稿は「退会したユーザー」の名義で残します。
                お問い合わせだけは、30日後に完全に削除します。
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="reason" className="mb-2">
          理由（記録に残ります。本人には表示されません）
        </Label>

        <textarea
          id="reason"
          name="reason"
          required
          maxLength={500}
          rows={3}
          className={fieldClassName}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="blockReRegistration"
          className="mt-1"
        />
        <span>
          <span className="font-medium">同じメールアドレスでの再登録を拒否する</span>
          <span className="mt-1 block text-muted-foreground">
            メールアドレスから作成した識別子を保持します（元のメールアドレスは復元できません）。
          </span>
        </span>
      </label>

      <div>
        <Label htmlFor="confirm" className="mb-2">
          確認のため、「削除」と入力してください
        </Label>

        <input
          id="confirm"
          name="confirm"
          type="text"
          autoComplete="off"
          required
          className={fieldClassName}
        />
      </div>

      <p className="text-sm text-red-700">
        この操作は取り消せません。削除後30日間も、アカウントや投稿を元に戻すことはできません。
      </p>

      {state.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <Button
        type="submit"
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={isPending}
        onClick={(event) => {
          const confirmed = window.confirm(
            'このユーザーを削除しますか？\n\nこの操作は取り消せません。'
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            削除中...
          </>
        ) : (
          'ユーザーを削除する'
        )}
      </Button>
    </form>
  );
}
