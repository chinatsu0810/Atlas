'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Gift, MessageCircle, UsersRound } from 'lucide-react';
import { COUNTRIES, THEMES } from '../../hub/_data';
import { THEME_ICONS } from '../../hub/_ui';

const featured = ['india', 'china', 'singapore', 'thailand', 'usa', 'uk', 'australia', 'germany'];

const stepLabel = 'text-[11px] font-bold tracking-wide text-[#6B8498]';
const chip = 'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition';
const chipOff = 'border-[#D8E7F0] bg-white text-[#35617E] hover:border-[#9EC6DF]';
const chipOn = 'border-[#1478B8] bg-[#1478B8] font-semibold text-white';

// 国 → 地域 → テーマ を、同じ場所で順に選んでいく
export function DestinationPicker() {
  const [countrySlug, setCountrySlug] = useState('');
  const [regionSlug, setRegionSlug] = useState('');
  const [showAll, setShowAll] = useState(false);

  const country = COUNTRIES.find((item) => item.slug === countrySlug);
  const region = country?.regions.find((item) => item.slug === regionSlug);
  const listed = showAll ? COUNTRIES : COUNTRIES.filter((item) => featured.includes(item.slug));

  const pickCountry = (slug: string) => {
    setCountrySlug(slug === countrySlug ? '' : slug);
    const next = COUNTRIES.find((item) => item.slug === slug);
    // 地域がひとつしかない国は、選ぶ手間を省く
    setRegionSlug(next && next.regions.length === 1 ? next.regions[0].slug : '');
  };

  return (
    <div className="rounded-2xl border border-[#C9DFEA] bg-white p-4 shadow-[0_14px_36px_rgba(20,73,107,0.12)] md:p-6">
      <p className={stepLabel}>1　国</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {listed.map((item) => (
          <button key={item.slug} type="button" onClick={() => pickCountry(item.slug)} className={`${chip} ${item.slug === countrySlug ? chipOn : chipOff}`}>
            {item.name}
          </button>
        ))}
        {!showAll && (
          <button type="button" onClick={() => setShowAll(true)} className={`${chip} border-dashed border-[#C9DDE9] text-[#6B8498]`}>
            ほかの国
          </button>
        )}
      </div>

      {country && (
        <div className="mt-5 border-t border-[#EEF3F6] pt-4">
          <p className={stepLabel}>2　地域</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {country.regions.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setRegionSlug(item.slug === regionSlug ? '' : item.slug)}
                className={`${chip} ${item.slug === regionSlug ? chipOn : chipOff}`}
              >
                {item.slug === regionSlug && <Check className="mr-1 inline h-3.5 w-3.5" />}
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {country && region && (
        <div className="mt-5 border-t border-[#EEF3F6] pt-4">
          <p className={stepLabel}>3　知りたいこと</p>
          <div className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-6">
            {THEMES.filter((theme) => theme.key !== 'giveaway' && theme.key !== 'other').map((theme) => {
              const Icon = THEME_ICONS[theme.key];
              const has = Boolean(region.themes[theme.key]);
              return (
                <Link
                  key={theme.key}
                  href={`/mock/hub/${country.slug}/${region.slug}/${theme.key}`}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${
                    has ? 'border-[#D8E7F0] bg-white' : 'border-dashed border-[#E1EBF1] bg-[#F8FBFD] opacity-70'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${has ? 'text-[#1478B8]' : 'text-[#9FB3C1]'}`} />
                  <span className="text-[11px] font-medium leading-4 text-[#174C73] md:text-xs">{theme.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#1478B8]">
            <Link href="/giveaways" className="flex items-center gap-1">
              <Gift className="h-3.5 w-3.5" />
              {region.name}で譲る・もらう
            </Link>
            <Link href="/gather" className="flex items-center gap-1">
              <UsersRound className="h-3.5 w-3.5" />
              {region.name}の集まり
            </Link>
            <Link href="/questions/new" className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {region.name}について聞く
            </Link>
            <Link href={`/mock/hub/${country.slug}/${region.slug}`} className="ml-auto flex items-center gap-1 text-[#6B8498]">
              地域のページへ
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
