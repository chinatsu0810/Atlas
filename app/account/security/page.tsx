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
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { updatePassword } from '@/app/(login)/actions';

type ActionState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(updatePassword, {});

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-7 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            ログイン情報
          </h1>

          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            パスワードを変更できます。
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
            <form className="space-y-5 md:space-y-6" action={formAction}>

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

              {state.error && (
                <p className="text-sm text-red-500">
                  {state.error}
                </p>
              )}

              {state.success && (
                <p className="text-sm text-green-600">
                  {state.success}
                </p>
              )}

              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isPending}
              >
                {isPending ? (
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