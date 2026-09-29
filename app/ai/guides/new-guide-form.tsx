'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { createPlaceGuide } from '@/lib/ai/guides/actions';

type PlaceOption = { slug: string; name: string; regions: { slug: string; name: string }[] };
type ThemeOption = { key: string; label: string };

const selectClass =
  'h-11 w-full rounded-xl border border-[#D8E7F0] bg-white px-3 text-base text-[#174C73] outline-none focus:border-[#1478B8] sm:text-sm';

export function NewGuideForm({ places, themes }: { places: PlaceOption[]; themes: ThemeOption[] }) {
  const router = useRouter();
  const [countrySlug, setCountrySlug] = useState(places[0]?.slug ?? '');
  const place = places.find((item) => item.slug === countrySlug);
  const [regionSlug, setRegionSlug] = useState(place?.regions[0]?.slug ?? '');
  const [themeKey, setThemeKey] = useState(themes[0]?.key ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const changeCountry = (slug: string) => {
    setCountrySlug(slug);
    setRegionSlug(places.find((item) => item.slug === slug)?.regions[0]?.slug ?? '');
  };

  const submit = () => {
    setError('');
    startTransition(async () => {
      const result = await createPlaceGuide({ countrySlug, regionSlug, themeKey, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/ai/guides/${result.data.id}`);
    });
  };

  return (
    <div className="rounded-2xl border border-[#C9DFEA] bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-[#123B5D]">新しいまとめを作る</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-[#406783]">
          国
          <select value={countrySlug} onChange={(e) => changeCountry(e.target.value)} className={`mt-1 ${selectClass}`}>
            {places.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#406783]">
          地域
          <select value={regionSlug} onChange={(e) => setRegionSlug(e.target.value)} className={`mt-1 ${selectClass}`}>
            {place?.regions.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#406783]">
          テーマ
          <select value={themeKey} onChange={(e) => setThemeKey(e.target.value)} className={`mt-1 ${selectClass}`}>
            {themes.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold text-[#406783]">
        編集長への指示（任意）
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="例：日本人学校とインターの違いを中心に。現地校にも触れてください。"
          className="mt-1 w-full rounded-xl border border-[#D8E7F0] px-3 py-2 text-base text-[#174C73] outline-none focus:border-[#1478B8] sm:text-sm"
        />
      </label>

      {error && <p className="mt-3 text-sm text-[#D14343]">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !countrySlug || !regionSlug || !themeKey}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-[#1478B8] px-6 text-sm font-semibold text-white transition hover:bg-[#0D5686] disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {pending ? '作成中…' : 'AI社員に作ってもらう'}
      </button>
      <p className="mt-2 text-xs text-[#7F95A6]">
        企画 → 調査（Web検索）→ 正誤チェック → 執筆 → 審査 の順に進み、会長の確認待ちで止まります。数分かかります。
      </p>
    </div>
  );
}
