'use client';

import Link from 'next/link';
import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';

import { resetPassword, type ResetPasswordState } from './actions';

const initialState: ResetPasswordState = {
  error: '',
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState
  );

  return (
    <main className="min-h-[100dvh] bg-gray-50 px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              パスワードをリセット
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              新しいパスワードを入力してください。
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Mail className="h-6 w-6 text-orange-500" />
              </div>
            </div>

            {state.success ? (
              <div className="space-y-5">
                <div className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700">
                  {state.success}
                </div>

                <Link
                  href="/sign-in"
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-600"
                >
                  ログインへ進む
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-5">
                <input type="hidden" name="token" value={token} />

                {state.error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                    {state.error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    新しいパスワード
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    placeholder="8文字以上"
                  />
                </div>

                <div>
                  <label
                    htmlFor="passwordConfirm"
                    className="text-sm font-medium text-gray-700"
                  >
                    新しいパスワード（確認）
                  </label>

                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    placeholder="もう一度入力してください"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending || !token}
                  className="h-11 w-full rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? '変更しています…' : 'パスワードを変更する'}
                </button>
              </form>
            )}

            <div className="mt-7 border-t border-gray-100 pt-6 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                ログインに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}