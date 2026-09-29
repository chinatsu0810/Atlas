import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getPlaceGuide } from '@/lib/ai/guides/queries';
import { guideTargetLabel } from '@/lib/places/labels';

import { GuideWorkspace } from './guide-workspace';

export const metadata = { title: '国・地域別まとめ作成｜Atlas 運営' };

// このページから呼ぶ「次の段階へ進める」操作は、Web検索を含むと数分かかる
export const maxDuration = 300;

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">アクセスできません</h1>
        <p className="mt-3 text-sm text-gray-600">このページは運営のみ利用できます。</p>
      </main>
    );
  }

  const id = Number((await params).id);
  const guide = Number.isInteger(id) ? await getPlaceGuide(id) : null;
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 text-[#123B5D] md:px-6 md:py-10">
      <Link href="/ai/guides" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        国・地域別まとめの一覧へ
      </Link>

      <p className="text-sm text-muted-foreground">国・地域別まとめ作成</p>
      <h1 className="text-2xl font-bold tracking-tight">
        {guideTargetLabel(guide.countrySlug, guide.regionSlug, guide.themeKey)}
      </h1>
      <Link
        href={`/places/${guide.countrySlug}/${guide.regionSlug}/${guide.themeKey}`}
        className="mt-1 inline-block text-sm text-[#1478B8] hover:underline"
        target="_blank"
      >
        ページを開く
      </Link>

      <GuideWorkspace initialGuide={guide} />
    </main>
  );
}
