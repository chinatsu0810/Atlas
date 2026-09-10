'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import {
  updatePassword,
  deleteAccount,
} from '@/app/(login)/actions';

type ActionState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  password?: string;
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [passwordState, passwordFormAction, isPasswordPending] =
    useActionState<ActionState, FormData>(updatePassword, {});

  const [deleteState, deleteFormAction, isDeletePending] =
    useActionState<ActionState, FormData>(deleteAccount, {});

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-7 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            ログイン情報
          </h1>

          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            パスワードを変更したり、アカウントを削除できます。
          </p>
        </div>

        {/* Password */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg md:text-xl">
              パスワードを変更
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              className="space-y-5 md:space-y-6"
              action={passwordFormAction}
            >
              <div>
                <Label htmlFor="currentPassword" className="mb-2">
                  現在のパスワード
                </Label>

                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="newPassword" className="mb-2">
                  新しいパスワード
                </Label>

                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={100}
                />

                <p className="mt-2 text-sm text-muted-foreground">
                  8文字以上で設定してください。
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="mb-2">
                  新しいパスワード（確認）
                </Label>

                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={100}
                />
              </div>

              {passwordState.error && (
                <p className="text-sm text-red-500">
                  {passwordState.error}
                </p>
              )}

              {passwordState.success && (
                <p className="text-sm text-green-600">
                  {passwordState.success}
                </p>
              )}

              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isPasswordPending}
              >
                {isPasswordPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    変更中...
                  </>
                ) : (
                  'パスワードを変更する'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="mt-8 border-red-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-red-600">
              <AlertTriangle className="h-5 w-5" />
              アカウントを削除
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">
                  アカウントを削除すると、ログインできなくなります。
                </p>

                <p className="mt-2">
                  投稿や回答など、Atlas上で公開されたコンテンツは
                  アカウント削除後も残ります。
                </p>
              </div>

              <form
                className="space-y-5"
                action={deleteFormAction}
              >
                <div>
                  <Label htmlFor="deletePassword" className="mb-2">
                    現在のパスワード
                  </Label>

                  <PasswordInput
                    id="deletePassword"
                    name="password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                    maxLength={100}
                  />

                  <p className="mt-2 text-sm text-muted-foreground">
                    本人確認のため、現在のパスワードを入力してください。
                  </p>
                </div>

                {deleteState.error && (
                  <p className="text-sm text-red-500">
                    {deleteState.error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={isDeletePending}
                  onClick={(event) => {
                    const confirmed = window.confirm(
                      'アカウントを削除しますか？\n\nこの操作を実行すると、ログインできなくなります。'
                    );

                    if (!confirmed) {
                      event.preventDefault();
                    }
                  }}
                >
                  {isDeletePending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      削除中...
                    </>
                  ) : (
                    'アカウントを削除する'
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Back */}
        <div className="mt-7 md:mt-8 pb-6">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイページに戻る
          </Link>
        </div>

      </div>
    </main>
  );
}