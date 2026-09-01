import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import ProfileForm from './profile-form';

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 md:px-6 md:py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            ログインが必要です
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            プロフィールを表示するにはログインしてください。
          </p>

          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            ログイン
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6 md:py-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-7 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            プロフィール
          </h1>

          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            ニックネームやメールアドレスを変更できます。
          </p>
        </div>

        <ProfileForm
          name={user.name ?? ''}
          email={user.email}
        />

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