'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

export function Login({
  mode = 'signin',
}: {
  mode?: 'signin' | 'signup';
}) {
  const searchParams = useSearchParams();

  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');

  const [state, formAction, pending] = useActionState<
    ActionState,
    FormData
  >(mode === 'signin' ? signIn : signUp, { error: '' });

  const isSignIn = mode === 'signin';

  return (
    <div className="min-h-[100dvh] bg-gray-50">

      {/* Main */}
      <main className="flex min-h-[100dvh] items-start justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {isSignIn ? 'ログイン' : '新規登録'}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {isSignIn
                ? 'Atlasを利用するにはログインしてください。'
                : 'Atlasをはじめるためのアカウントを作成します。'}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <form className="space-y-5" action={formAction}>
              <input
                type="hidden"
                name="redirect"
                value={redirect || ''}
              />

              <input
                type="hidden"
                name="priceId"
                value={priceId || ''}
              />

              <input
                type="hidden"
                name="inviteId"
                value={inviteId || ''}
              />

              {/* Email */}
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  メールアドレス
                </Label>

                <div className="mt-2">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    required
                    maxLength={255}
                    className="h-11 rounded-lg border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                    placeholder="メールアドレスを入力"
                  />
                </div>
              </div>

              {/* Nickname */}
              {!isSignIn && (
                <div>
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    ニックネーム
                  </Label>

                  <div className="mt-2">
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="nickname"
                      defaultValue={state.name}
                      required
                      maxLength={100}
                      className="h-11 rounded-lg border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                      placeholder="投稿時に表示する名前"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    質問や回答を投稿したときに表示されます。
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  パスワード
                </Label>

                <div className="mt-2">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      isSignIn
                        ? 'current-password'
                        : 'new-password'
                    }
                    defaultValue={state.password}
                    required
                    minLength={8}
                    maxLength={100}
                    className="h-11 rounded-lg border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
                    placeholder="パスワードを入力"
                  />
                </div>

                {!isSignIn && (
                  <p className="mt-2 text-xs text-gray-500">
                    8文字以上で設定してください。
                  </p>
                )}
              </div>

              {/* Error */}
              {state?.error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {state.error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-600"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : isSignIn ? (
                  'ログイン'
                ) : (
                  '新規登録'
                )}
              </Button>
              {isSignIn && (
  <div className="mt-3 text-center">
    <Link
      href="/forgot-password"
      className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
    >
      パスワードを忘れた方
    </Link>
  </div>
)}
            </form>

            {/* Switch */}
            <div className="mt-7 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-gray-500">
                {isSignIn
                  ? '初めて利用する方'
                  : 'すでにアカウントをお持ちの方'}
              </p>

              <Link
                href={`${isSignIn ? '/sign-up' : '/sign-in'}${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
                className="mt-2 inline-block text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
              >
                {isSignIn
                  ? '新規登録はこちら'
                  : 'ログインはこちら'}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}