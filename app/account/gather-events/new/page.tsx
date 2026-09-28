import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { GatherEventForm } from '@/components/gather/event-form';
import { isAdmin } from '@/lib/auth/permissions';
import { countries } from '@/lib/constants/countries';
import { getUser } from '@/lib/db/queries';
import { AccessDenied } from '../../users/access-denied';

export default async function NewGatherEventPage() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return <AccessDenied />;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/account/gather-events"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        イベントの一覧へ戻る
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">イベントを追加</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        「公開する」を押すと、すぐに「集まる」に表示されます。確認が済んでいなければ、下書きで保存してください。
      </p>

      <GatherEventForm countries={countries} />
    </main>
  );
}
