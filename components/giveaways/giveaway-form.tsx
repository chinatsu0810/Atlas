'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OctagonAlert } from 'lucide-react';

import { countries } from '@/lib/constants/countries';
import {
  CURRENCIES,
  DEFAULT_FREE_CURRENCY,
  GIVEAWAY_CATEGORIES,
  LISTING_DAYS,
  MAX_AVAILABLE_DAYS,
  MAX_CURRENCY_LENGTH,
  OTHER_CURRENCY,
} from '@/lib/giveaways/constants';
import {
  findProhibitedWord,
  type ProhibitedMatch,
} from '@/lib/giveaways/prohibited-items';
import { createGiveaway, updateGiveaway } from '@/lib/giveaways/actions';
import { GiveawayImageUploader } from './image-uploader';
import { GiveawayDialog, dialogPrimaryButton } from './giveaway-dialog';

export type GiveawayFormValues = {
  title: string;
  description: string;
  category: string;
  country: string;
  city: string;
  area: string;
  priceAmount: number | null;
  currency: string | null;
  availableUntil: string | null;
  imageUrls: string[];
};

const inputClass =
  'w-full rounded-xl border border-[#D8E7F0] bg-white px-3 py-2.5 text-sm text-[#123B5D] outline-none transition focus:border-[#1478B8] focus:ring-2 focus:ring-[#1478B8]/15 disabled:opacity-60';

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[#123B5D]"
      >
        {label}
        {required ? (
          <span className="rounded bg-[#FDECEC] px-1.5 py-0.5 text-[10px] font-semibold text-[#D14343]">
            必須
          </span>
        ) : (
          <span className="rounded bg-[#EEF2F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#7F95A6]">
            任意
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#6B8498]">{hint}</p>}
    </div>
  );
}

export function GiveawayForm({
  giveawayId,
  initial,
}: {
  // 編集のときだけ渡す
  giveawayId?: number;
  initial?: GiveawayFormValues;
}) {
  const router = useRouter();

  const initialCountryIsListed =
    !initial || (countries as readonly string[]).includes(initial.country);

  const [imageUrls, setImageUrls] = useState<string[]>(initial?.imageUrls ?? []);
  const [category, setCategory] = useState(initial?.category ?? '');
  const [country, setCountry] = useState(
    initial ? (initialCountryIsListed ? initial.country : 'その他') : ''
  );
  const [priceType, setPriceType] = useState<'free' | 'paid'>(
    initial?.priceAmount ? 'paid' : 'free'
  );
  const initialCurrencyIsListed =
    !initial?.currency ||
    (CURRENCIES as readonly string[]).includes(initial.currency);
  const initialFreeCurrency = initialCurrencyIsListed ? '' : initial?.currency ?? '';
  const [currency, setCurrency] = useState(
    initial?.currency
      ? initialCurrencyIsListed
        ? initial.currency
        : OTHER_CURRENCY
      : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prohibited, setProhibited] = useState<ProhibitedMatch | null>(null);

  // サーバーの判定に合わせ、時差を考えて1日前から選べるようにする
  const today = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const latestDate = new Date(Date.now() + MAX_AVAILABLE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(event.currentTarget);

    const match = findProhibitedWord(
      String(formData.get('title') ?? ''),
      String(formData.get('description') ?? '')
    );

    if (match) {
      setProhibited(match);
      return;
    }

    if (imageUrls.length === 0) {
      setError('写真を1枚以上追加してください。');
      return;
    }

    formData.set('imageUrls', JSON.stringify(imageUrls));

    setSubmitting(true);
    setError(null);

    const result = giveawayId
      ? await updateGiveaway(giveawayId, formData)
      : await createGiveaway(formData);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    router.push(`/giveaways/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="写真" required>
        <GiveawayImageUploader
          value={imageUrls}
          onChange={setImageUrls}
          disabled={submitting}
        />
      </Field>

      <Field label="タイトル" htmlFor="title" required>
        <input
          id="title"
          name="title"
          maxLength={100}
          defaultValue={initial?.title}
          placeholder="例：IKEAの2人掛けソファ（グレー）"
          className={inputClass}
          disabled={submitting}
          required
        />
      </Field>

      <Field
        label="説明"
        htmlFor="description"
        required
        hint="状態・サイズ・使用年数・傷の有無などを書くと、やりとりがスムーズです。"
      >
        <textarea
          id="description"
          name="description"
          rows={7}
          maxLength={5000}
          defaultValue={initial?.description}
          placeholder="例：2022年に購入、使用3年です。目立つ傷はありません。幅150cm。車で運べる方だと助かります。"
          className={inputClass}
          disabled={submitting}
          required
        />
      </Field>

      <Field label="カテゴリ" htmlFor="category" required>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
          disabled={submitting}
          required
        >
          <option value="" disabled>
            カテゴリを選択してください
          </option>
          {GIVEAWAY_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {category === 'food' && (
          <p className="mt-2 rounded-lg bg-[#FFF6E8] px-3 py-2 text-xs leading-5 text-[#8A5A12]">
            食品は、未開封・賞味期限内のものに限ります。お酒・医薬品・サプリメント類は譲れません。
          </p>
        )}
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="国・地域" htmlFor="country" required>
          <select
            id="country"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
            disabled={submitting}
            required
          >
            <option value="" disabled>
              国・地域を選択してください
            </option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {country === 'その他' && (
            <input
              name="countryFreeText"
              defaultValue={initialCountryIsListed ? '' : initial?.country}
              placeholder="国名・地域名（例：ジョージア）"
              className={`${inputClass} mt-2`}
              disabled={submitting}
              required
            />
          )}
        </Field>

        <Field label="都市" htmlFor="city" required>
          <input
            id="city"
            name="city"
            maxLength={100}
            defaultValue={initial?.city}
            placeholder="例：バンコク"
            className={inputClass}
            disabled={submitting}
            required
          />
        </Field>
      </div>

      <Field
        label="受け渡しエリア"
        htmlFor="area"
        hint="「〇〇駅周辺」程度にとどめ、住所は書かないでください。"
      >
        <input
          id="area"
          name="area"
          maxLength={100}
          defaultValue={initial?.area}
          placeholder="例：BTSプロンポン駅周辺"
          className={inputClass}
          disabled={submitting}
        />
      </Field>

      <Field
        label="価格"
        required
        hint="Atlasは代金のやり取りに関わりません。支払い方法は当事者同士で決めてください。"
      >
        <div className="flex gap-2">
          {(
            [
              ['free', '無料'],
              ['paid', '有料'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                priceType === value
                  ? 'border-[#1478B8] bg-[#EAF4FB] text-[#1478B8]'
                  : 'border-[#D8E7F0] text-[#4F6B80]'
              }`}
            >
              <input
                type="radio"
                name="priceType"
                value={value}
                checked={priceType === value}
                onChange={() => setPriceType(value)}
                className="sr-only"
                disabled={submitting}
              />
              {label}
            </label>
          ))}
        </div>

        {priceType === 'paid' && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="priceAmount" className="mb-1 block text-xs font-medium text-[#4F6B80]">
                金額
              </label>
              <input
                id="priceAmount"
                name="priceAmount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={initial?.priceAmount ?? undefined}
                placeholder="例：20"
                className={inputClass}
                disabled={submitting}
                required
              />
            </div>

            <div>
              <label htmlFor="currency" className="mb-1 block text-xs font-medium text-[#4F6B80]">
                通貨
              </label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
                disabled={submitting}
                required
              >
                <option value="" disabled>
                  通貨を選択してください
                </option>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
                <option value={OTHER_CURRENCY}>その他（自由に書く）</option>
              </select>
            </div>

            {currency === OTHER_CURRENCY && (
              <div className="sm:col-span-2">
                <input
                  name="currencyFreeText"
                  maxLength={MAX_CURRENCY_LENGTH}
                  defaultValue={initialFreeCurrency}
                  placeholder={`例：MNT、ドル（空欄なら「${DEFAULT_FREE_CURRENCY}」と表示）`}
                  aria-label="通貨（自由記載）"
                  className={inputClass}
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-[#6B8498]">
                  通貨の単位がわからない場合は、空欄のままで大丈夫です。
                </p>
              </div>
            )}
          </div>
        )}
      </Field>

      <Field
        label="受け渡し可能期限"
        htmlFor="availableUntil"
        hint={`帰国日など、この日までに受け渡したいという日があれば（1年以内）。書いた場合はその日まで、書かない場合は${LISTING_DAYS}日間、募集中として表示されます。`}
      >
        <input
          id="availableUntil"
          name="availableUntil"
          type="date"
          min={today}
          max={latestDate}
          defaultValue={initial?.availableUntil ?? undefined}
          className={inputClass}
          disabled={submitting}
        />
      </Field>

      <div className="rounded-xl bg-[#F4F8FA] px-4 py-3 text-xs leading-5 text-[#4F6B80]">
        医薬品・お酒・たばこ・武器・生き物・偽ブランド品・金券などは譲れません。
        <Link href="/giveaways/guide#prohibited" className="ml-1 font-semibold text-[#1478B8] underline">
          禁止品を確認する
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-sm text-[#B03030]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#1478B8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0D5686] disabled:opacity-60 md:w-auto"
      >
        {submitting ? '送信中…' : giveawayId ? '変更を保存する' : '投稿する'}
      </button>

      <GiveawayDialog
        open={prohibited !== null}
        onOpenChange={(open) => !open && setProhibited(null)}
        icon={<OctagonAlert className="h-5 w-5 text-[#D14343]" />}
        title="この内容では投稿できません"
        footer={
          <button
            type="button"
            onClick={() => setProhibited(null)}
            className={dialogPrimaryButton}
          >
            内容を見直す
          </button>
        }
      >
        {prohibited && (
          <>
            <p>
              タイトルか説明に、
              <strong className="font-semibold text-[#B03030]">
                「{prohibited.word}」（{prohibited.category}）
              </strong>
              が含まれています。この品目は「譲る」では扱えません。
            </p>
            <p className="text-xs text-[#6B8498]">
              禁止品ではないのに表示された場合は、
              <Link href="/contact" className="font-semibold text-[#1478B8] underline">
                お問い合わせ
              </Link>
              からお知らせください。
            </p>
          </>
        )}
      </GiveawayDialog>
    </form>
  );
}
