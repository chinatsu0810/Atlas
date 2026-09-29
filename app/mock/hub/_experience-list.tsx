'use client';

import { useState } from 'react';
import { CircleUserRound } from 'lucide-react';

type Experience = {
  id: number;
  title: string;
  schoolType: string;
  childStage: string;
  profile: string[];
  reason: string;
  concern: string;
  author: string;
  date: string;
};

const chipClass = 'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition';
const chipOff = 'border-[#D8E7F0] bg-white text-[#35617E] hover:bg-[#F1F8FC]';
const chipOn = 'border-[#1478B8] bg-[#1478B8] text-white';

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="w-20 shrink-0 text-[11px] font-semibold text-[#406783]">{label}</span>
      {['すべて', ...options].map((option) => {
        const active = option === 'すべて' ? value === '' : value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option === 'すべて' ? '' : option)}
            className={`${chipClass} ${active ? chipOn : chipOff}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function ExperienceList({ experiences }: { experiences: Experience[] }) {
  const [stage, setStage] = useState('');
  const [type, setType] = useState('');

  const shown = experiences.filter(
    (experience) => (!stage || experience.childStage === stage) && (!type || experience.schoolType === type),
  );

  return (
    <div>
      <div className="mb-4 space-y-2 rounded-xl border border-[#DCEAF2] bg-white p-3">
        <p className="text-[11px] text-[#7F95A6]">自分と近い状況の人の話から読めます</p>
        <ChipRow label="子どもの年齢" options={['未就学', '小学生', '中高生']} value={stage} onChange={setStage} />
        <ChipRow label="選んだ学校" options={['日本人学校', 'インター', '現地校', '転校']} value={type} onChange={setType} />
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#C9DDE9] bg-white py-8 text-center text-sm text-[#678096]">
          この条件の経験談は、まだありません。
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((experience) => (
            <article
              key={experience.id}
              className="flex flex-col rounded-xl border border-[#E1EBF1] border-t-4 border-t-[#8CC5E4] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#E8F6FC] px-2.5 py-1 text-xs text-[#1478B8]">
                  {experience.schoolType}
                </span>
                {experience.profile.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#F1F5F8] px-2.5 py-1 text-xs text-[#557086]">
                    {tag}
                  </span>
                ))}
              </div>

              <h3 className="mt-3 text-sm font-bold leading-6 text-[#174C73]">{experience.title}</h3>

              <dl className="mt-3 flex-1 space-y-2 text-xs leading-5">
                <div className="rounded-lg bg-[#F4FBF8] px-3 py-2">
                  <dt className="font-semibold text-[#1F5F5B]">この人が決めた理由</dt>
                  <dd className="mt-0.5 text-[#406783]">{experience.reason}</dd>
                </div>
                <div className="rounded-lg bg-[#F8FBFD] px-3 py-2">
                  <dt className="font-semibold text-[#557086]">気になったこと・工夫</dt>
                  <dd className="mt-0.5 text-[#406783]">{experience.concern}</dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center justify-between border-t border-[#E8EEF2] pt-3 text-xs text-[#7890A2]">
                <span className="flex min-w-0 items-center gap-1">
                  <CircleUserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{experience.author}</span>
                  <span>・</span>
                  <span className="shrink-0">{experience.date}</span>
                </span>
                <span className="shrink-0 font-semibold text-[#1478B8]">続きを読む</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
