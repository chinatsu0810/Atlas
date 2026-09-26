// 「譲る」の禁止品リストと、その判定。
// 投稿のタイトル・本文に禁止語が含まれていたら、投稿できない。
// 画面（投稿前のポップアップ）とサーバー（保存前の最終チェック）の両方で使う。
//
// 語の追加・削除は、このファイルの PROHIBITED_CATEGORIES だけを編集すればよい。
// - words: 禁止語。ひらがな・カタカナ・漢字・英字をそのまま書く（表記ゆれは下の正規化で吸収する）
// - exceptions: 禁止語を含んでいても通す語（例: 「酒器」）
//
// 判定の前に、次の正規化をする。
// - 全角・半角をそろえる（NFKC）、英字を小文字にする
// - 日本語の語は、空白と「・」を取り除いた文で判定する（「タ バ コ」も一致させる）
// - 英語の語は、単語の区切りで一致させる（"gun" は "begun" に一致しない）
// - カタカナで始まる（終わる）語は、直前（直後）がカタカナなら一致とみなさない
//   （「ワイン」は「ワイングラス」に、「シガー」は「シガーソケット」に一致しない）
//
// 意味が広く、普通の投稿まで止めてしまう語（「草」「アイス」「薬」「犬」「ナイフ」など）は入れない。
// それらは通報と運営の非表示で対応する。

export type ProhibitedCategory = {
  label: string;
  words: string[];
  exceptions?: string[];
};

export const PROHIBITED_CATEGORIES: ProhibitedCategory[] = [
  {
    label: '違法薬物',
    words: [
      '大麻', 'マリファナ', 'ガンジャ', 'ハッパ', 'thc', 'cbd',
      '覚醒剤', '覚せい剤', 'シャブ', 'コカイン', 'ヘロイン', 'mdma',
      'エクスタシー', 'lsd', 'ケタミン', '危険ドラッグ', '脱法ハーブ',
      '合法ハーブ', 'marijuana', 'cannabis', 'cocaine', 'weed',
    ],
  },
  {
    label: '医薬品・医療機器',
    words: [
      '医薬品', '処方薬', '市販薬', '常備薬', '風邪薬', 'かぜ薬', '解熱剤',
      '鎮痛剤', '痛み止め', '胃薬', '整腸剤', '目薬', '睡眠薬', '睡眠導入剤',
      '抗生物質', '向精神薬', '精神安定剤', '漢方薬', 'ピル', 'アフターピル',
      'バイアグラ', 'ED治療薬', '痩せ薬', 'やせ薬', '注射器', '注射針',
      'インスリン', 'コンタクトレンズ', 'カラコン',
      // 日本の市販薬の商品名（海外在住者が手放しがちなため）
      'ロキソニン', 'バファリン', 'タイレノール', 'パブロン', 'ルル',
      '正露丸', 'ビオフェルミン', '太田胃散', 'ガスター', 'アレグラ', 'ムヒ',
      'オロナイン', '葛根湯', 'ナロン', 'セデス', 'イブクイック',
    ],
  },
  {
    label: '酒類',
    words: [
      '酒類', 'お酒', '日本酒', '焼酎', '泡盛', '梅酒', '果実酒', '料理酒',
      'ビール', 'ワイン', 'シャンパン', 'ウイスキー', 'ウィスキー',
      'ブランデー', 'ウォッカ', 'テキーラ', 'リキュール', 'チューハイ',
      'ハイボール', 'sake', 'beer', 'wine', 'whisky', 'whiskey', 'vodka',
    ],
    exceptions: [
      '日本酒グラス', '焼酎グラス', 'wine glass', 'wineglass', 'beer glass',
    ],
  },
  {
    label: 'たばこ・電子たばこ',
    words: [
      'たばこ', 'タバコ', '煙草', '紙巻き', '葉巻', 'シガー', 'シガレット',
      'ニコチン', 'アイコス', 'iqos', 'グロー', 'プルームテック', 'vape',
      'ベイプ', 'シーシャ', 'cigarette', 'cigar',
    ],
  },
  {
    label: '武器・危険物',
    words: [
      '銃', 'ピストル', 'ライフル', 'エアガン', 'ガスガン', '電動ガン',
      'モデルガン', '実弾', '弾薬', '火薬', '爆竹', '花火', '爆発物',
      '日本刀', '模造刀', '刀剣', '木刀', '手裏剣', 'メリケンサック',
      'ナックルダスター', '特殊警棒', '警棒', 'スタンガン', '催涙スプレー',
      '防犯スプレー', 'ペッパースプレー', '飛び出しナイフ', 'バタフライナイフ',
      'サバイバルナイフ', 'ダガーナイフ', 'gun', 'pistol', 'rifle', 'taser',
    ],
    exceptions: ['glue gun', 'nail gun'],
  },
  {
    label: '生き物',
    words: [
      '生体', '生き物', '子犬', '子猫', '仔犬', '仔猫', '里親', '熱帯魚',
      '昆虫', '爬虫類',
    ],
    exceptions: [
      '生き物図鑑', '昆虫図鑑', '爬虫類図鑑', '熱帯魚用', '子犬用', '子猫用',
      '爬虫類用', '昆虫用',
    ],
  },
  {
    label: '偽造品・権利侵害',
    words: [
      '偽物', 'ニセモノ', '偽ブランド', 'コピー品', 'スーパーコピー', 'n級品',
      '海賊版', '違法コピー', '非正規品', 'パチモン', 'バッタもん', 'バッタモン',
      'クラック版',
    ],
  },
  {
    label: '金券・お金・チケット類',
    words: [
      '両替', '金券', '商品券', 'ギフト券', 'ギフトカード', 'プリペイドカード',
      '仮想通貨', '暗号資産', 'ビットコイン', '航空券', 'コンサートチケット',
      '定期券', 'マイル譲渡', 'simカード', 'アカウント譲渡',
    ],
  },
  {
    label: '本人確認書類・個人情報',
    words: [
      'パスポート', '旅券', '在留カード', '運転免許証', '身分証', '保険証',
      'マイナンバー', '住民票', '印鑑証明', '通帳', 'キャッシュカード',
      '銀行口座', '口座売買',
    ],
    exceptions: ['パスポート入れ', '通帳ケース', '通帳入れ'],
  },
  {
    label: 'アダルト・その他',
    words: [
      'アダルトグッズ', '大人のおもちゃ', '使用済み下着', '盗品', '拾得物',
      '臓器', '母乳', '精子', '卵子',
    ],
    exceptions: ['母乳パッド', '母乳実感', '母乳バッグ', '母乳保存', '母乳用'],
  },
];

export type ProhibitedMatch = { word: string; category: string };

const KATAKANA = 'ァ-ヺー';
const KATAKANA_CHAR = new RegExp(`[${KATAKANA}]`);
const LATIN_WORD = /^[a-z0-9 ]+$/;

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Matcher = {
  word: string;
  category: string;
  latin: boolean;
  pattern: RegExp;
};

function buildMatcher(word: string, category: string): Matcher {
  const normalized = normalize(word);
  const latin = LATIN_WORD.test(normalized);

  if (latin) {
    return {
      word,
      category,
      latin,
      pattern: new RegExp(
        `(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`
      ),
    };
  }

  const compact = normalized.replace(/[\s・]/g, '');
  const before = KATAKANA_CHAR.test(compact[0]) ? `(^|[^${KATAKANA}])` : '';
  const after = KATAKANA_CHAR.test(compact[compact.length - 1])
    ? `([^${KATAKANA}]|$)`
    : '';

  return {
    word,
    category,
    latin,
    pattern: new RegExp(`${before}${escapeRegExp(compact)}${after}`),
  };
}

const MATCHERS: Matcher[] = PROHIBITED_CATEGORIES.flatMap((category) =>
  category.words.map((word) => buildMatcher(word, category.label))
);

const EXCEPTIONS: string[] = PROHIBITED_CATEGORIES.flatMap(
  (category) => category.exceptions ?? []
)
  .map(normalize)
  // 長い語から消す（短い語が長い語の一部を先に消さないように）
  .sort((a, b) => b.length - a.length);

// 例外語を区切り文字に置き換える
function removeExceptions(text: string, compact: boolean): string {
  let result = text;

  for (const exception of EXCEPTIONS) {
    const target = compact ? exception.replace(/[\s・]/g, '') : exception;
    result = result.split(target).join('/');
  }

  return result;
}

/**
 * 文章に禁止語が含まれていれば、最初に見つかった語を返す。含まれていなければ null。
 */
export function findProhibitedWord(...texts: string[]): ProhibitedMatch | null {
  const normalized = normalize(texts.join('\n'));

  const spaced = removeExceptions(normalized.replace(/\s+/g, ' '), false);
  const compact = removeExceptions(normalized.replace(/[\s・]/g, ''), true);

  for (const matcher of MATCHERS) {
    const target = matcher.latin ? spaced : compact;

    if (matcher.pattern.test(target)) {
      return { word: matcher.word, category: matcher.category };
    }
  }

  return null;
}

export function prohibitedMessage(match: ProhibitedMatch): string {
  return `「${match.word}」（${match.category}）に当たる物は、譲ることができません。`;
}
