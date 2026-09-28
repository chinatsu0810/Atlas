'use client';

import { useRouter } from 'next/navigation';

// 国を選んだらすぐに絞り込む。地域は国ごとに違うので、国を変えたら地域の選択は外す
export function GatherCountrySelect({
  countries,
  selected,
  query,
}: {
  countries: string[];
  selected: string;
  // 国・地域以外の、いまの絞り込み条件
  query: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <select
      id="gather-country"
      value={selected}
      onChange={(event) => {
        const params = new URLSearchParams(query);
        if (event.target.value) params.set('country', event.target.value);
        const search = params.toString();
        router.push(search ? `/gather?${search}` : '/gather');
      }}
      className="w-full max-w-[260px] rounded-xl border border-[#D8E7F0] bg-white px-3 py-2 text-sm text-[#123B5D] outline-none focus:border-[#1478B8]"
    >
      <option value="">すべての国</option>
      {countries.map((country) => (
        <option key={country} value={country}>
          {country}
        </option>
      ))}
    </select>
  );
}
