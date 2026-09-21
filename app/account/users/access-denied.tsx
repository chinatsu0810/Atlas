import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function AccessDenied() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900">
        アクセスできません
      </h1>

      <p className="mt-3 text-sm text-gray-600">
        このページは運営のみ利用できます。
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
