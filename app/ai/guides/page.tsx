import Link from 'next/link';
import { ArrowLeft, BookOpenCheck } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { listPlaceGuides } from '@/lib/ai/guides/queries';
import { GUIDE_STATUS_LABELS } from '@/lib/ai/guides/types';
import { PLACES, THEMES, regionsOf } from '@/lib/places/data';
import { guideTargetLabel } from '@/lib/places/labels';

import { NewGuideForm } from './new-guide-form';

export const metadata = { title: '国・地域別まとめ作成｜Atlas 運営' };

export default async function GuidesPage() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">アクセスできません</h1>
        <p className="mt-3 text-sm text-gray-600">このページは運営のみ利用できます。</p>
        <Link href="/account" className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          マイページへ戻る
        </Link>
      </main>
    );
  }

  // テーブルがまだ無い環境（マイグレーション前）でも、ページは表示する
  let loadError = false;
  const guides = await listPlaceGuides().catch((error) => {
    console.error('Failed to load place guides:', error);
    loadError = true;
    return [];
  });

  const places = PLACES.map((place) => ({
    slug: place.slug,
    name: place.name,
    regions: regionsOf(place).map((region) => ({ slug: region.slug, name: region.name })),
  }));
  const themes = THEMES.map((theme) => ({ key: theme.key, label: theme.label }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 text-[#123B5D] md:px-6 md:py-10">
      <Link href="/office" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Atlas Officeへ戻る
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF4FB]">
          <BookOpenCheck className="h-5 w-5 text-[#1478B8]" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">運営・ガイド編集部</p>
          <h1 className="text-2xl font-bold tracking-tight">国・地域別まとめ作成</h1>
        </div>
      </div>

      {loadError && (
        <p className="mb-6 rounded-xl border border-[#F5D9A8] bg-[#FFFBF2] px-4 py-3 text-sm text-[#8A5A12]">
          まとめを読み込めませんでした。DBのマイグレーション（0025_place_guides.sql）が本番に適用されているか確認してください。
        </p>
      )}

      <NewGuideForm places={places} themes={themes} />

      <h2 className="mb-3 mt-10 text-base font-bold">これまでのまとめ</h2>
      {guides.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center text-sm text-[#678096]">
          まだありません。
        </p>
      ) : (
        <ul className="divide-y divide-[#EEF3F6] overflow-hidden rounded-2xl border border-[#E1EBF1] bg-white">
          {guides.map((guide) => (
            <li key={guide.id}>
              <Link href={`/ai/guides/${guide.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F8FBFD]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#174C73]">
                    {guideTargetLabel(guide.countrySlug, guide.regionSlug, guide.themeKey)}
                  </span>
                  <span className="text-[11px] text-[#7F95A6]">
                    更新 {guide.updatedAt.toLocaleString('ja-JP')}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    guide.error
                      ? 'bg-[#FDECEC] text-[#D14343]'
                      : guide.status === 'published'
                        ? 'bg-[#E8F5F3] text-[#1F5F5B]'
                        : guide.status === 'pending_review' || guide.status === 'plan_review'
                          ? 'bg-[#FFF4E8] text-[#B45309]'
                          : 'bg-[#EAF4FB] text-[#1478B8]'
                  }`}
                >
                  {guide.error ? '止まっています' : GUIDE_STATUS_LABELS[guide.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
