'use client';

import { useActionState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Globe, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  email?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = '',
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          ニックネーム
        </Label>

        <Input
          id="name"
          name="name"
          placeholder="質問や回答で表示される名前"
          defaultValue={state.name || nameValue}
          required
          maxLength={100}
        />

        <p className="mt-2 text-sm text-muted-foreground">
          質問や回答を投稿したときに表示されます。
        </p>
      </div>

      <div>
        <Label htmlFor="email" className="mb-2">
          メールアドレス
        </Label>

        <Input
          id="email"
          name="email"
          type="email"
          placeholder="メールアドレス"
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({
  state,
}: {
  state: ActionState;
}) {
  const { data: user } = useSWR<User>('/api/user', fetcher);

  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(updateAccount, {});

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Atlas ホーム */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center transition-opacity hover:opacity-80"
            aria-label="Atlas ホームへ戻る"
          >
            <Globe className="h-6 w-6 text-sky-600" />
            <span className="ml-2 text-xl font-semibold tracking-tight text-gray-900">
              Atlas
            </span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mt-6 mb-3">
            プロフィール
          </h1>

          <p className="text-muted-foreground">
            ニックネームやメールアドレスを変更できます。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>プロフィール情報</CardTitle>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" action={formAction}>
              <Suspense fallback={<AccountForm state={state} />}>
                <AccountFormWithData state={state} />
              </Suspense>

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
                className="bg-orange-500 text-white hover:bg-orange-600"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '変更を保存'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 下の戻る */}
        <div className="mt-12 pb-8">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイページに戻る
          </Link>
        </div>

      </div>
    </main>
  );
}