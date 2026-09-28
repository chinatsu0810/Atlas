'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';

import type { GatherEvent } from '@/lib/db/schema';
import {
  saveGatherEvent,
  type GatherEventFormState,
} from '@/lib/gather/actions';
import {
  GATHER_FORMATS,
  GATHER_SOURCES,
  GATHER_THEMES,
} from '@/lib/gather/constants';

const fieldClass =
  'mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200';
const labelClass = 'block text-sm font-medium text-gray-900';
const hintClass = 'mt-1 text-xs text-gray-500';

// 運営画面の、イベントの追加・編集フォーム
export function GatherEventForm({
  countries,
  event,
}: {
  countries: string[];
  event?: GatherEvent;
}) {
  const [state, formAction, isPending] = useActionState<
    GatherEventFormState,
    FormData
  >(saveGatherEvent, {});

  const published = Boolean(event?.publishedAt);

  return (
    <form action={formAction} className="mt-6 space-y-6">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div>
        <label htmlFor="title" className={labelClass}>イベント名</label>
        <input id="title" name="title" required maxLength={100} defaultValue={event?.title} className={fieldClass} />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>説明</label>
        <textarea
          id="description"
          name="description"
          required
          maxLength={2000}
          rows={5}
          defaultValue={event?.description}
          className={fieldClass}
        />
        <p className={hintClass}>どんな内容か、どんな人に向けたイベントかを書きます。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="eventDate" className={labelClass}>開催日（現地の日付）</label>
          <input id="eventDate" name="eventDate" type="date" required defaultValue={event?.eventDate} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="startTime" className={labelClass}>開始時刻（任意）</label>
          <input id="startTime" name="startTime" maxLength={50} placeholder="10:00、21:00（日本時間）など" defaultValue={event?.startTime ?? ''} className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="country" className={labelClass}>国</label>
          <select id="country" name="country" required defaultValue={event?.country ?? ''} className={fieldClass}>
            <option value="" disabled>選択してください</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="region" className={labelClass}>地域・都市</label>
          <input id="region" name="region" maxLength={100} placeholder="グルガオン、バンコクなど" defaultValue={event?.region ?? ''} className={fieldClass} />
          <p className={hintClass}>一覧の「地域」の絞り込みに使います。表記をそろえてください。</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isOnline" defaultChecked={event?.isOnline} />
        オンライン開催
      </label>

      <div>
        <label htmlFor="venue" className={labelClass}>会場（任意）</label>
        <input id="venue" name="venue" maxLength={200} placeholder="サイバーシティ周辺のカフェ（詳細は申込後）、Zoom など" defaultValue={event?.venue ?? ''} className={fieldClass} />
        <p className={hintClass}>個人宅などの詳しい住所は書かないでください。</p>
      </div>

      <fieldset>
        <legend className={labelClass}>テーマ（複数選べます）</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GATHER_THEMES.map((theme) => (
            <label key={theme} className="cursor-pointer">
              <input
                type="checkbox"
                name="themes"
                value={theme}
                defaultChecked={event?.themes.includes(theme)}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-[#D8E7F0] bg-white px-3.5 py-1.5 text-xs text-[#35617E] transition peer-checked:border-[#1478B8] peer-checked:bg-[#1478B8] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#1478B8]/40">
                {theme}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="format" className={labelClass}>形式</label>
          <select id="format" name="format" required defaultValue={event?.format ?? ''} className={fieldClass}>
            <option value="" disabled>選択してください</option>
            {GATHER_FORMATS.map((format) => (
              <option key={format} value={format}>{format}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fee" className={labelClass}>参加費（任意）</label>
          <input id="fee" name="fee" maxLength={100} placeholder="無料、₹1,500（軽食つき）など" defaultValue={event?.fee ?? ''} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="audience" className={labelClass}>対象（任意）</label>
          <input id="audience" name="audience" maxLength={200} placeholder="0歳〜未就学児と保護者など" defaultValue={event?.audience ?? ''} className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="organizerName" className={labelClass}>主催者</label>
          <input id="organizerName" name="organizerName" required maxLength={100} defaultValue={event?.organizerName} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="organizerUrl" className={labelClass}>主催者のページ（任意）</label>
          <input id="organizerUrl" name="organizerUrl" type="url" maxLength={500} placeholder="https://" defaultValue={event?.organizerUrl ?? ''} className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="applyUrl" className={labelClass}>申込ページ（任意）</label>
        <input id="applyUrl" name="applyUrl" type="url" maxLength={500} placeholder="https://" defaultValue={event?.applyUrl ?? ''} className={fieldClass} />
        <p className={hintClass}>入力すると、イベントのページに「主催者のページで申し込む」ボタンが出ます。</p>
      </div>

      <fieldset>
        <legend className={labelClass}>掲載のきっかけ</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {GATHER_SOURCES.map((source) => (
            <label key={source.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="source"
                value={source.value}
                defaultChecked={(event?.source ?? 'request') === source.value}
              />
              {source.label}
            </label>
          ))}
        </div>
        <p className={hintClass}>イベントのページに「主催者からの依頼で掲載」「Atlas運営が選んで掲載」と表示します。</p>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-[#1478B8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D5686] disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {published ? '保存する（公開中）' : '公開する'}
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={isPending}
          className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          {published ? '下書きに戻して保存' : '下書き保存'}
        </button>
      </div>
    </form>
  );
}
