// 「譲る」機能の定数。画面（クライアント）とサーバーの両方から使う。

export const GIVEAWAY_CATEGORIES = [
  { value: 'furniture', label: '家具' },
  { value: 'appliances', label: '家電' },
  { value: 'kitchen', label: 'キッチン用品' },
  { value: 'books', label: '本・学習' },
  { value: 'kids', label: '子ども用品' },
  { value: 'clothing', label: '衣類・ファッション' },
  { value: 'food', label: '食品（未開封）' },
  { value: 'other', label: 'その他' },
] as const;

export type GiveawayCategory = (typeof GIVEAWAY_CATEGORIES)[number]['value'];

export function categoryLabel(value: string): string {
  return GIVEAWAY_CATEGORIES.find((c) => c.value === value)?.label ?? 'その他';
}

// 価格の通貨。金額は整数（小数は扱わない）。
// 一覧にない通貨は「その他」を選んで自由記載にする（空欄なら「現地通貨」）
export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'SGD', 'HKD', 'THB', 'MYR',
  'PHP', 'IDR', 'VND', 'KRW', 'CNY', 'TWD', 'INR', 'AED', 'CHF', 'SEK',
  'NOK', 'DKK', 'MXN', 'BRL', 'JPY',
] as const;

export const OTHER_CURRENCY = 'OTHER';
export const DEFAULT_FREE_CURRENCY = '現地通貨';
export const MAX_CURRENCY_LENGTH = 20;

export const GIVEAWAY_STATUSES = {
  open: { label: '募集中', className: 'bg-[#E3F4EA] text-[#1F7A4D]' },
  reserved: { label: '予定者決定', className: 'bg-[#FFF1DC] text-[#B45F06]' },
  handed_over: { label: '受け渡し済み', className: 'bg-[#E8F1FB] text-[#1D5FA8]' },
  completed: { label: '完了', className: 'bg-[#EEF2F5] text-[#5B7183]' },
  withdrawn: { label: '取り下げ', className: 'bg-[#EEF2F5] text-[#7F95A6]' },
  expired: { label: '期限切れ', className: 'bg-[#EEF2F5] text-[#7F95A6]' },
} as const;

export type GiveawayStatus = keyof typeof GIVEAWAY_STATUSES;

export function statusInfo(status: string) {
  return (
    GIVEAWAY_STATUSES[status as GiveawayStatus] ?? GIVEAWAY_STATUSES.open
  );
}

export const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// 募集の期限（日）。受け渡し可能期限を書かなかった場合
export const LISTING_DAYS = 30;

// 受け渡し可能期限は、今日から何日先まで設定できるか
export const MAX_AVAILABLE_DAYS = 365;

// 受け渡し済みから、自動で完了にするまで（日）
export const AUTO_COMPLETE_DAYS = 7;

// 完了・取り下げ・期限切れから、メッセージを削除するまで（日）
export const MESSAGE_RETENTION_DAYS = 365;

// 1ユーザーが1日に投稿できる件数
export const DAILY_POST_LIMIT = 5;

export function formatPrice(
  amount: number | null,
  currency: string | null
): string {
  if (amount === null || amount === 0 || !currency) {
    return '無料';
  }

  return `${amount.toLocaleString('en-US')} ${currency}`;
}
