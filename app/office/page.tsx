import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getOfficeState } from '@/lib/office/roster';

import { OfficeView } from './office-view';

export const metadata = {
  title: 'Atlas Office',
};

export default async function OfficePage() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">
          アクセスできません
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          このオフィスは運営のみ利用できます。
        </p>

        <Link
          href="/account"
          className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          マイページへ戻る
        </Link>
      </main>
    );
  }

  const initialState = await getOfficeState();

  return <OfficeView initialState={initialState} />;
}
