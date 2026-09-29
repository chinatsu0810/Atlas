// 「行き先」のページ（/places/国/地域/テーマ）の定義。
// 投稿には地域やテーマの項目が無いため、本文・タイトルの地名やキーワード、テーマタグから振り分ける。
// 国・地域を足したいときは lib/places/countries.ts を、テーマを直したいときはこのファイルを直せばよい
import { PLACES } from './countries';

export { PLACES } from './countries';

export type Region = {
  slug: string;
  name: string;
  // 本文・タイトル（譲るは受け渡し場所、イベントは地域）にこの言葉があれば、この地域の投稿とみなす
  keywords: string[];
  // 探す前に本文から取り除く言葉（地名を一部に含む、別の言葉）
  ignore?: string[];
};

export type Area =
  | 'asia'
  | 'oceania'
  | 'north-america'
  | 'latin-america'
  | 'europe'
  | 'middle-east'
  | 'africa'
  | 'other';

export const AREAS: { key: Area; label: string }[] = [
  { key: 'asia', label: 'アジア' },
  { key: 'oceania', label: '大洋州' },
  { key: 'north-america', label: '北米' },
  { key: 'latin-america', label: '中南米' },
  { key: 'europe', label: '欧州' },
  { key: 'middle-east', label: '中東' },
  { key: 'africa', label: 'アフリカ' },
  { key: 'other', label: 'その他' },
];

export type Place = {
  slug: string;
  // 投稿の country と同じ表記
  name: string;
  // public/flags の国旗（flag-icons, MIT）。国旗が無い地域名は null
  flag: string | null;
  area: Area;
  regions: Region[];
  // 投稿の country がこの表記でも、この国の投稿とみなす（「米国」「グアム」など）
  aliases: string[];
};

// 国全体（地名の書かれていない投稿を含む、その国のすべての投稿）を表す地域
export const WHOLE_COUNTRY = 'all';
// どの地域の地名も書かれていない投稿を集める地域
export const OTHER_REGION = 'other';

export type ThemeKey =
  | 'education'
  | 'housing'
  | 'medical'
  | 'living'
  | 'transport'
  | 'childcare'
  | 'work'
  | 'visa'
  | 'shopping'
  | 'food'
  | 'travel'
  | 'moving';

export type Theme = {
  key: ThemeKey;
  label: string;
  hint: string;
  // この名前のテーマタグ（tags.category = 'theme'）が付いた投稿は、このテーマに入る
  tags: string[];
  // タグが無くても、本文・タイトルにこの言葉があればこのテーマに入る。
  // 「生活」「車」「子ども」のように、関係のない投稿にも出やすい言葉は入れない
  keywords: string[];
};

export const THEMES: Theme[] = [
  {
    key: 'education',
    label: '学校・教育',
    hint: '学校選び、編入、日本語の学習',
    tags: ['学校', '教育'],
    keywords: ['学校', 'インター', '幼稚園', '保育園', 'プリスクール', '補習校', '入学', '編入', '転校', '受験', '塾'],
  },
  {
    key: 'housing',
    label: '住まい',
    hint: 'エリア、家探し、契約',
    tags: ['住まい'],
    keywords: ['家探し', '物件', '家賃', '賃貸', 'アパート', 'コンドミニアム', 'サービスアパート', '住まい', '大家'],
  },
  {
    key: 'medical',
    label: '医療・病院',
    hint: '病院、予防接種、保険',
    tags: ['医療', '保険'],
    keywords: ['病院', '医療', 'クリニック', '予防接種', 'ワクチン', '歯医者', '歯科', '出産', '受診', '薬局'],
  },
  {
    key: 'living',
    label: '生活',
    hint: '水・電気、お手伝いさん、治安、お金',
    tags: ['生活', '治安', '通信', 'お金', '銀行', '税金'],
    keywords: ['停電', '水道', '浄水', 'お手伝いさん', 'メイド', '治安', '銀行', '口座', 'SIM', '大気汚染'],
  },
  {
    key: 'transport',
    label: '交通',
    hint: '車、ドライバー、配車アプリ',
    tags: ['交通'],
    keywords: ['ドライバー', '運転', '渋滞', 'タクシー', '配車', 'Uber', '地下鉄', '電車', '免許'],
  },
  {
    key: 'childcare',
    label: '子育て',
    hint: '幼稚園、習い事、遊び場',
    tags: ['子育て'],
    keywords: ['子育て', '育児', '赤ちゃん', '習い事', 'ベビー', '乳幼児', 'ベビーシッター'],
  },
  {
    key: 'work',
    label: '仕事',
    hint: '働き方、現地採用、職場',
    tags: ['仕事'],
    keywords: ['仕事', '転職', '現地採用', '就職', '職場', '給与', '給料'],
  },
  {
    key: 'visa',
    label: 'ビザ・手続き',
    hint: 'ビザ、登録、各種手続き',
    tags: ['ビザ', '手続き'],
    keywords: ['ビザ', 'VISA', '査証', 'FRRO', '在留届', '滞在許可', '手続き'],
  },
  {
    key: 'shopping',
    label: '買い物',
    hint: '日本食材、日用品、通販',
    tags: ['買い物', '日本食'],
    keywords: ['買い物', 'スーパー', '日本食材', '通販', 'Amazon', '調味料'],
  },
  {
    key: 'food',
    label: '食事',
    hint: 'レストラン、食の安全',
    tags: [],
    keywords: ['レストラン', '外食', '屋台', '食事'],
  },
  {
    key: 'travel',
    label: '旅行・観光',
    hint: '週末旅行、国内移動',
    tags: [],
    keywords: ['旅行', '観光', '世界遺産'],
  },
  {
    key: 'moving',
    label: '帰国・引越し',
    hint: '帰国準備、荷物、手放すもの',
    tags: ['帰国準備'],
    keywords: ['本帰国', '帰任', '帰国準備', '引越し', '引っ越し', '船便'],
  },
];

export function findPlace(slug: string) {
  return PLACES.find((place) => place.slug === slug);
}

export function findPlaceByName(name: string) {
  return PLACES.find((place) => place.name === name || place.aliases.includes(name));
}

// 投稿の country として、この国とみなす表記
export function countryNamesOf(place: Place) {
  return [place.name, ...place.aliases];
}

export function findTheme(key: string) {
  return THEMES.find((theme) => theme.key === key);
}

// 地域を分けている国は、どの地域にも当てはまらない投稿を「その他」に集める。
// 国全体も地域のひとつとして扱う（地名の書かれていない投稿は、その他と国全体に出る）
export function regionsOf(place: Place): Region[] {
  if (place.regions.length === 0) {
    return [{ slug: WHOLE_COUNTRY, name: `${place.name}全体`, keywords: [] }];
  }
  return [
    ...place.regions,
    { slug: OTHER_REGION, name: 'その他', keywords: [] },
    { slug: WHOLE_COUNTRY, name: `${place.name}全体`, keywords: [] },
  ];
}

// 見出しなどに出す地域名。「その他」だけでは何の地域か分からないので、国名を添える
export function regionLabel(place: Place, region: Region) {
  return region.slug === OTHER_REGION ? `${place.name}（その他の地域）` : region.name;
}

export function findRegion(place: Place, slug: string) {
  return regionsOf(place).find((region) => region.slug === slug);
}

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function matchesCity(region: Region, text: string) {
  const cleaned = (region.ignore ?? []).reduce((rest, word) => rest.split(word).join(' '), text);
  return includesAny(cleaned, region.keywords);
}

export function matchesRegion(place: Place, region: Region, text: string) {
  if (region.slug === WHOLE_COUNTRY) return true;
  if (region.slug === OTHER_REGION) return !place.regions.some((city) => matchesCity(city, text));
  return matchesCity(region, text);
}

export function matchesTheme(theme: Theme, text: string, tagNames: string[]) {
  return tagNames.some((name) => theme.tags.includes(name)) || includesAny(text, theme.keywords);
}
