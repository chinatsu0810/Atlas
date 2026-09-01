'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';

type ActionState = {
  name?: string;
  email?: string;
  error?: string;
  success?: string;
};

type ProfileFormProps = {
  name: string;
  email: string;
};

export default function ProfileForm({
  name,
  email,
}: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<
    ActionState,
    FormData
  >(updateAccount, {});

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl">
          プロフィール情報
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form className="space-y-5 md:space-y-6" action={formAction}>

          <div>
            <Label htmlFor="name" className="mb-2">
              ニックネーム
            </Label>

            <Input
              id="name"
              name="name"
              placeholder="質問や回答で表示される名前"
              defaultValue={state.name ?? name}
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
              defaultValue={state.email ?? email}
              required
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
  );
}