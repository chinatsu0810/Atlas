'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import { countries } from '@/lib/constants/countries';

// 既存の /search は、スペース区切りの言葉をすべて含む投稿を探す。
// 国を選んでいれば、国名を言葉の先頭に足して渡す。
// スマホでは「言葉＋探す」を上、国を下に置く（まず打ちたいのは言葉のため）。
// 入力欄は 16px 以上にして、iPhone で入力時に画面が拡大されないようにする
export function PlaceSearch({
  initialCountry = '',
  placeholder = '学校、病院、ビザなど',
  size = 'lg',
}: {
  initialCountry?: string;
  placeholder?: string;
  size?: 'lg' | 'md';
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry);
  const [keyword, setKeyword] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = [country, keyword.trim()].filter(Boolean).join(' ');
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const height = size === 'lg' ? 'h-12' : 'h-11';

  return (
    <form
      onSubmit={submit}
      role="search"
      className="flex flex-col gap-2 rounded-2xl border border-[#C9DFEA] bg-white p-2 sm:flex-row sm:items-center sm:gap-0"
    >
      <label className={`relative order-2 flex items-center gap-2 rounded-xl bg-[#F4F8FA] px-3 sm:order-none sm:w-44 sm:bg-transparent ${height}`}>
        <MapPin className="h-4 w-4 shrink-0 text-[#1478B8]" />
        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          aria-label="国"
          className="h-full w-full appearance-none bg-transparent pr-6 text-base font-medium text-[#174C73] outline-none sm:text-sm"
        >
          <option value="">すべての国</option>
          {countries.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#7F9AAD]" />
      </label>

      <span className="hidden h-7 w-px bg-[#E1EBF1] sm:block" aria-hidden />

      <div className="order-1 flex min-w-0 flex-1 items-center gap-2 sm:order-none sm:pl-3">
        <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#F4F8FA] px-3 sm:bg-transparent sm:px-0 ${height}`}>
          <Search className="hidden h-4 w-4 shrink-0 text-[#7F9AAD] sm:block" />
          <input
            type="search"
            enterKeyHint="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={placeholder}
            aria-label="知りたいこと"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-[#123B5D] outline-none placeholder:text-[#8AA0B0]"
          />
        </div>

        <button
          type="submit"
          className={`shrink-0 rounded-xl bg-[#1478B8] px-5 text-base font-semibold text-white transition hover:bg-[#0D5686] active:bg-[#0D5686] sm:px-6 sm:text-sm ${height}`}
        >
          探す
        </button>
      </div>
    </form>
  );
}
