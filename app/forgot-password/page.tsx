'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

import { requestPasswordReset } from './actions';

export default function ForgotPasswordPage() {
const [state, formAction, pending] = useActionState(
requestPasswordReset,
{ error: '', success: '' }
);

return ( <main className="min-h-[100dvh] bg-gray-50 px-4 py-12"> <div className="mx-auto flex min-h-[80dvh] w-full max-w-md items-center"> <div className="w-full"> <div className="mb-8 text-center"> <h1 className="text-2xl font-bold tracking-tight text-gray-900">
パスワードを忘れた方 </h1>

        <p className="mt-2 text-sm text-gray-500">
          登録しているメールアドレスを入力してください。
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Mail className="h-6 w-6 text-orange-500" />
          </div>
        </div>

        {state.success ? (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm leading-6 text-green-700">
            {state.success}
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="メールアドレスを入力"
              />
            </div>

            {state.error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : (
                'リセットメールを送信'
              )}
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
