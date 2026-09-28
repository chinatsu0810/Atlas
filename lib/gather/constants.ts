// 「集まる」のイベントで使う選択肢

// テーマ。経験談・Q&Aのテーマタグ（lib/db/seed-tags.ts）と同じ名前にそろえている。
// 「趣味」だけはイベント用で、経験談・Q&Aのタグにはない
export const GATHER_THEMES = [
  '子育て',
  '教育',
  '仕事',
  '住まい',
  '医療',
  '友人作り',
  '言語',
  '手続き',
  '帰国準備',
  '趣味',
  'その他',
] as const;

export const GATHER_FORMATS = [
  '交流会',
  'セミナー',
  '勉強会',
  '説明会',
  '座談会',
  '季節行事',
  'その他',
] as const;

export const GATHER_SOURCES = [
  { value: 'request', label: '主催者からの依頼' },
  { value: 'pick', label: '運営が選んだ' },
] as const;

export type GatherSource = (typeof GATHER_SOURCES)[number]['value'];

// 一覧の期間の切り替え
export const GATHER_WHENS = [
  'all',
  'weekend',
  'this-month',
  'next-month',
  'online',
] as const;

export type GatherWhen = (typeof GATHER_WHENS)[number];

export function isGatherTheme(value: string): boolean {
  return (GATHER_THEMES as readonly string[]).includes(value);
}

export function isGatherWhen(value: string): value is GatherWhen {
  return (GATHER_WHENS as readonly string[]).includes(value);
}
