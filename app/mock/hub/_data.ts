// 情報ハブのモック用データ。DB は使わず、すべてこのファイルのサンプルで表示する。
// 作り込んでいるのは インド → デリー / グルガオン → 学校・教育 だけで、ほかはダミー。

export type ThemeKey =
  | 'education'
  | 'housing'
  | 'medical'
  | 'living'
  | 'transport'
  | 'work'
  | 'visa'
  | 'childcare'
  | 'shopping'
  | 'food'
  | 'travel'
  | 'giveaway'
  | 'other';

// 世界共通のテーマ。国・地域ごとに、この中から情報があるものだけが並ぶ
export const THEMES: { key: ThemeKey; label: string; hint: string }[] = [
  { key: 'education', label: '学校・教育', hint: '学校選び、編入、日本語の学習' },
  { key: 'housing', label: '住まい', hint: 'エリア、家探し、契約' },
  { key: 'medical', label: '医療・病院', hint: '病院、予防接種、保険' },
  { key: 'living', label: '生活', hint: '水・電気、お手伝いさん、治安' },
  { key: 'transport', label: '交通', hint: '車、ドライバー、配車アプリ' },
  { key: 'childcare', label: '子育て', hint: '幼稚園、習い事、遊び場' },
  { key: 'work', label: '仕事', hint: '働き方、現地採用、職場' },
  { key: 'visa', label: 'ビザ・手続き', hint: 'ビザ、登録、各種手続き' },
  { key: 'shopping', label: '買い物', hint: '日本食材、日用品、通販' },
  { key: 'food', label: '食事', hint: 'レストラン、食の安全' },
  { key: 'travel', label: '旅行・観光', hint: '週末旅行、国内移動' },
  { key: 'giveaway', label: '譲る', hint: '帰任・引越しで手放すもの' },
  { key: 'other', label: 'その他', hint: 'どこにも当てはまらないこと' },
];

export type ThemeStatus = 'rich' | 'some' | 'collecting';

export type Region = {
  slug: string;
  name: string;
  note: string;
  // テーマごとの情報量。載っていないテーマは「情報募集中」として扱う
  themes: Partial<Record<ThemeKey, number>>;
};

export type Country = {
  slug: string;
  name: string;
  code: string;
  area: 'アジア' | '北米' | 'ヨーロッパ' | 'オセアニア' | 'その他';
  lead: string;
  regions: Region[];
};

// 国名は lib/constants/countries.ts の並びに合わせている
export const COUNTRIES: Country[] = [
  {
    slug: 'india',
    name: 'インド',
    code: 'IN',
    area: 'アジア',
    lead: '州や都市によって、暮らし方も手に入る情報も大きく変わります。まずは住む地域を選んでください。',
    regions: [
      {
        slug: 'gurgaon',
        name: 'デリー / グルガオン',
        note: '日系企業の駐在員とその家族が多く暮らすエリア',
        themes: {
          education: 28,
          housing: 14,
          medical: 11,
          living: 9,
          transport: 6,
          childcare: 7,
          visa: 5,
          shopping: 4,
          food: 3,
          work: 2,
          giveaway: 12,
        },
      },
      {
        slug: 'mumbai',
        name: 'ムンバイ',
        note: '金融・商業の中心。海沿いのエリアに住む人が多い',
        themes: { housing: 5, education: 4, medical: 3, living: 2, visa: 1 },
      },
      {
        slug: 'bangalore',
        name: 'バンガロール',
        note: 'IT企業が集まる南インドの都市',
        themes: { work: 4, housing: 3, education: 2, living: 1 },
      },
      {
        slug: 'chennai',
        name: 'チェンナイ',
        note: '自動車関連の日系企業が多い南インドの都市',
        themes: { education: 2, housing: 2, medical: 1 },
      },
      {
        slug: 'other',
        name: 'その他の地域',
        note: 'アーメダバード、プネーなど',
        themes: { living: 1 },
      },
    ],
  },
  dummyCountry('china', '中国', 'CN', 'アジア', [
    ['shanghai', '上海'],
    ['beijing', '北京'],
    ['guangzhou', '広州 / 深圳'],
  ]),
  dummyCountry('singapore', 'シンガポール', 'SG', 'アジア', [
    ['singapore', 'シンガポール全域'],
  ]),
  dummyCountry('thailand', 'タイ', 'TH', 'アジア', [
    ['bangkok', 'バンコク'],
    ['chonburi', 'チョンブリ / シラチャ'],
  ]),
  dummyCountry('vietnam', 'ベトナム', 'VN', 'アジア', [
    ['hcmc', 'ホーチミン'],
    ['hanoi', 'ハノイ'],
  ]),
  dummyCountry('indonesia', 'インドネシア', 'ID', 'アジア', [['jakarta', 'ジャカルタ']]),
  dummyCountry('malaysia', 'マレーシア', 'MY', 'アジア', [['kl', 'クアラルンプール']]),
  dummyCountry('usa', 'アメリカ', 'US', '北米', [
    ['nyc', 'ニューヨーク / ニュージャージー'],
    ['la', 'ロサンゼルス'],
    ['bay', 'サンフランシスコ / ベイエリア'],
    ['other', 'その他の地域'],
  ]),
  dummyCountry('canada', 'カナダ', 'CA', '北米', [
    ['vancouver', 'バンクーバー'],
    ['toronto', 'トロント'],
  ]),
  dummyCountry('mexico', 'メキシコ', 'MX', '北米', [['bajio', 'バヒオ地域']]),
  dummyCountry('uk', 'イギリス', 'GB', 'ヨーロッパ', [['london', 'ロンドン']]),
  dummyCountry('germany', 'ドイツ', 'DE', 'ヨーロッパ', [
    ['dusseldorf', 'デュッセルドルフ'],
    ['munich', 'ミュンヘン'],
  ]),
  dummyCountry('france', 'フランス', 'FR', 'ヨーロッパ', [['paris', 'パリ']]),
  dummyCountry('netherlands', 'オランダ', 'NL', 'ヨーロッパ', [['amsterdam', 'アムステルダム']]),
  dummyCountry('australia', 'オーストラリア', 'AU', 'オセアニア', [
    ['sydney', 'シドニー'],
    ['melbourne', 'メルボルン'],
  ]),
  dummyCountry('newzealand', 'ニュージーランド', 'NZ', 'オセアニア', [['auckland', 'オークランド']]),
  dummyCountry('middleeast', '中東', 'ME', 'その他', [['dubai', 'ドバイ']]),
];

function dummyCountry(
  slug: string,
  name: string,
  code: string,
  area: Country['area'],
  regions: [string, string][],
): Country {
  return {
    slug,
    name,
    code,
    area,
    lead: 'このモックでは、国と地域の並びだけを用意しています。',
    regions: regions.map(([regionSlug, regionName], index) => ({
      slug: regionSlug,
      name: regionName,
      note: '',
      themes:
        index === 0
          ? { housing: 3, education: 2, medical: 2, living: 1 }
          : { living: 1 },
    })),
  };
}

export const AREAS: Country['area'][] = ['アジア', '北米', 'ヨーロッパ', 'オセアニア', 'その他'];

export function findCountry(slug: string) {
  return COUNTRIES.find((country) => country.slug === slug);
}

export function findRegion(country: Country, slug: string) {
  return country.regions.find((region) => region.slug === slug);
}

export function findTheme(key: string) {
  return THEMES.find((theme) => theme.key === key);
}

export function regionTotal(region: Region) {
  return Object.values(region.themes).reduce((sum, count) => sum + (count ?? 0), 0);
}

export function countryTotal(country: Country) {
  return country.regions.reduce((sum, region) => sum + regionTotal(region), 0);
}

export function themeStatus(count: number | undefined): ThemeStatus {
  if (!count) return 'collecting';
  if (count >= 10) return 'rich';
  return 'some';
}

// 地域の略称。ページタイトル（「グルガオンの学校選び」など）に使う
export function regionShortName(region: Region) {
  const parts = region.name.split(' / ');
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------
// 情報の出どころ。Atlas が判断した内容と、外部の情報を混ぜないために、
// すべての情報にどれかひとつを付ける
// ---------------------------------------------------------------

export type SourceKind = 'official' | 'experience' | 'qa' | 'atlas';

export const SOURCE_LABELS: Record<SourceKind, { label: string; description: string }> = {
  official: {
    label: '公式情報',
    description: '大使館・公的機関・学校などが自ら発信している一次情報',
  },
  experience: {
    label: '経験談より',
    description: 'Atlas に投稿された、個人の経験談に書かれていること',
  },
  qa: {
    label: 'Q&Aより',
    description: 'Atlas の Q&A で、経験者が回答していること',
  },
  atlas: {
    label: 'Atlasの整理',
    description: '上の情報を Atlas が並べ替え・要約したもの。判断や評価は含めません',
  },
};

export type Fact = {
  text: string;
  source: SourceKind;
  // 出典の具体的な名前（「在インド日本国大使館」「経験談 5件」など）
  cite: string;
};

// ---------------------------------------------------------------
// 地域の「テーマ」ページ（情報が少ないテーマ用の汎用データ）
// ---------------------------------------------------------------

export const GENERIC_SAMPLES: Partial<
  Record<ThemeKey, { experiences: string[]; questions: string[] }>
> = {
  housing: {
    experiences: [
      '家探しは3週間。停電と水の出方を内見で必ず確認しました',
      'ゲーテッドコミュニティとサービスアパート、両方住んでみて',
    ],
    questions: ['家賃の交渉はどのくらいできましたか？', '契約時にデポジットは何か月分でしたか？'],
  },
  medical: {
    experiences: ['子どもの発熱で夜間に受診したときのこと', '日本語が通じるクリニックを探した話'],
    questions: ['予防接種の記録は日本の母子手帳で足りましたか？'],
  },
  living: {
    experiences: ['お手伝いさんとの契約で最初に決めておいたこと'],
    questions: ['浄水器はどのタイプを使っていますか？'],
  },
  transport: {
    experiences: ['ドライバーさんを雇うまでの流れ'],
    questions: ['配車アプリは子どもだけで乗せても大丈夫でしたか？'],
  },
  childcare: {
    experiences: ['未就学児との毎日の過ごし方'],
    questions: ['日本語で参加できる習い事はありますか？'],
  },
  visa: {
    experiences: ['帯同家族のビザ更新で待たされた話'],
    questions: ['FRRO の登録は到着後いつまでに行いましたか？'],
  },
  work: {
    experiences: ['現地採用で働いてみて'],
    questions: [],
  },
  shopping: {
    experiences: ['日本食材はどこで買っているか'],
    questions: ['日本の調味料、持ち込むならどれが正解でしたか？'],
  },
  food: {
    experiences: ['子どもと行きやすいレストラン'],
    questions: [],
  },
};

// ---------------------------------------------------------------
// ここから「グルガオンの学校選び」（作り込みページ）
// ---------------------------------------------------------------

export const SCHOOL_GUIDE = {
  updatedAt: '2026年9月20日',
  counts: { experiences: 18, questions: 9, links: 8 },

  basics: [
    {
      text: 'グルガオン（グルグラム）はデリー首都圏（NCR）の一部です。日本人学校はデリー市内にあり、グルガオンからはスクールバスや車で通っている家庭が多いようです。',
      source: 'experience',
      cite: '経験談 7件',
    },
    {
      text: '学年の始まりは学校によって異なります。日本人学校は日本と同じ4月、インターナショナルスクールは8月ごろ始まる学校が多く、インドの現地校は4月始まりが一般的です。',
      source: 'official',
      cite: '各校の公式サイト',
    },
    {
      text: '年度の途中で入る場合、学年によっては空きを待つことがあった、という声があります。赴任が決まった段階で問い合わせた人が多いです。',
      source: 'experience',
      cite: '経験談 5件・Q&A 2件',
    },
    {
      text: '冬（11月〜1月ごろ）は大気汚染の影響で、休校やオンライン授業になった年があります。',
      source: 'qa',
      cite: 'Q&A 3件',
    },
    {
      text: '学費・入学条件・募集状況は毎年変わります。このページの内容は目安として使い、最新の情報は必ず各校・公的機関の公式情報で確認してください。',
      source: 'atlas',
      cite: 'Atlas編集メモ',
    },
  ] satisfies Fact[],

  // 「自分の場合」を考えるための問いかけ。答えは出さない
  selfCheck: [
    { question: 'インドにはどのくらい住む予定ですか？', related: '学校の種類', href: '#types' },
    { question: '帰国後、日本の学校（受験など）にどうつなげたいですか？', related: '経験談', href: '#experiences' },
    { question: 'お子さんの年齢・学年と、いまの英語・日本語の状況は？', related: '入学・編入', href: '#practical' },
    { question: '通学に、片道どのくらいまでかけられそうですか？', related: '通学', href: '#practical' },
    { question: '学費は会社の補助がありますか？ 範囲は決まっていますか？', related: '費用', href: '#practical' },
    { question: 'お子さん本人は、どんな環境を望んでいますか？', related: '経験談', href: '#experiences' },
  ],

  schoolTypes: [
    {
      key: 'japanese',
      name: '日本人学校',
      summary: '日本の学習指導要領に沿って、日本語で授業を行う学校です。',
      features: [
        { label: '授業の言語', value: '日本語（英語・現地理解の授業もある）' },
        { label: 'カリキュラム', value: '日本の学習指導要領' },
        { label: '学年の始まり', value: '4月' },
        { label: '対象', value: '小学部・中学部（学校の公式情報で確認）' },
      ],
      checkPoints: [
        'グルガオンからのスクールバスの有無と乗車時間',
        '年度途中の編入の受け入れ',
        '高校段階の進路をどう考えるか',
      ],
      experienceCount: 7,
      questionCount: 3,
    },
    {
      key: 'international',
      name: 'インターナショナルスクール',
      summary: '英語で授業を行い、国際的なカリキュラムを採用している学校です。',
      features: [
        { label: '授業の言語', value: '英語' },
        { label: 'カリキュラム', value: 'IB・ケンブリッジなど（学校による）' },
        { label: '学年の始まり', value: '8月ごろが多い' },
        { label: '対象', value: '幼児〜高校（学校による）' },
      ],
      checkPoints: [
        '英語サポート（EAL/ESL）の有無と内容',
        '入学時の面談・テストの内容',
        '学費以外にかかる費用（施設費・バス代など）',
      ],
      experienceCount: 8,
      questionCount: 4,
    },
    {
      key: 'local',
      name: '現地の私立校',
      summary: 'インドの教育制度に沿った学校です。英語で授業を行う学校も多くあります。',
      features: [
        { label: '授業の言語', value: '英語が中心（ヒンディー語の授業あり）' },
        { label: 'カリキュラム', value: 'CBSE・ICSE など' },
        { label: '学年の始まり', value: '4月が多い' },
        { label: '対象', value: '幼児〜高校' },
      ],
      checkPoints: [
        '外国籍の子どもの受け入れ実績',
        'ヒンディー語の授業の扱い',
        '宿題や試験の量',
      ],
      experienceCount: 2,
      questionCount: 1,
    },
    {
      key: 'other',
      name: 'そのほかの学び方',
      summary: '学校と組み合わせたり、事情に合わせて選ばれている方法です。',
      features: [
        { label: '例', value: '日本語の補習、通信教育、オンライン学習' },
        { label: '組み合わせ', value: 'インター＋日本語の学習など' },
        { label: '時期', value: '一時帰国中の体験入学など' },
      ],
      checkPoints: ['日本語の学習をどう続けるか', '帰国のタイミングとの関係'],
      experienceCount: 1,
      questionCount: 1,
    },
  ],

  practical: [
    {
      key: 'cost',
      title: '費用',
      facts: [
        {
          text: '授業料のほかに、入学金・施設費・スクールバス代・制服や教材費などがかかる場合があります。',
          source: 'experience',
          cite: '経験談 5件',
        },
        {
          text: '学校を探し始める前に、会社の教育費補助の範囲（対象の学校・上限）を確認した、という人が多いです。',
          source: 'experience',
          cite: '経験談 4件',
        },
        {
          text: '金額は年度ごとに改定されます。各校が公開している最新の学費表で確認してください。',
          source: 'official',
          cite: '各校の公式サイト',
        },
      ],
    },
    {
      key: 'admission',
      title: '入学・編入',
      facts: [
        {
          text: '在学証明書・成績証明書・予防接種の記録・パスポートやビザの写しなどを求められることがあります。必要な書類は学校によって違います。',
          source: 'official',
          cite: '各校の入学案内',
        },
        {
          text: 'インターでは、入学前に面談や英語のアセスメントがあった、という声があります。',
          source: 'qa',
          cite: 'Q&A 2件',
        },
        {
          text: '日本を出る前に、今の学校で英文の在学証明書を用意しておいてよかった、という声があります。',
          source: 'experience',
          cite: '経験談 3件',
        },
      ],
    },
    {
      key: 'commute',
      title: '通学',
      facts: [
        {
          text: 'グルガオンの住まいの場所によって、日本人学校までの時間は大きく変わります。片道1時間前後かかったという声もあります。',
          source: 'experience',
          cite: '経験談 4件',
        },
        {
          text: '学校選びと住まい選びを同時に進めた家庭が多いです。',
          source: 'experience',
          cite: '経験談 6件',
        },
      ],
    },
    {
      key: 'timing',
      title: '時期・スケジュール',
      facts: [
        {
          text: '赴任の時期と学年の始まり（4月・8月など）がずれる場合、どこで区切るかを家族で話し合ったという経験談があります。',
          source: 'experience',
          cite: '経験談 3件',
        },
        {
          text: '年度途中の募集状況は、学校に直接問い合わせる必要があります。',
          source: 'atlas',
          cite: 'Atlas編集メモ',
        },
      ],
    },
  ] satisfies { key: string; title: string; facts: Fact[] }[],

  experiences: [
    {
      id: 1,
      title: '日本人学校を選びました。帰国後の受験を考えて',
      schoolType: '日本人学校',
      childStage: '小学生',
      profile: ['帯同家族', '小4・中1', '滞在予定3年'],
      reason: '帰国のタイミングが中学受験・高校受験と重なりそうだったので、日本の学習の流れを途切れさせたくなかった。',
      concern: '英語に触れる時間が少なくなることは気になった。放課後に英語の習い事を足している。',
      author: 'Mika',
      date: '2026/8/28',
    },
    {
      id: 2,
      title: 'インターに決めました。最初の半年は本人がとても大変でした',
      schoolType: 'インター',
      childStage: '小学生',
      profile: ['帯同家族', '小2', '滞在予定4〜5年'],
      reason: '滞在が長くなりそうだったのと、本人が「英語で友だちをつくりたい」と言ったこと。',
      concern: '最初の半年は授業がほとんど分からず、毎朝泣いていた。EALのサポートがある学校かどうかは大事だった。',
      author: 'Yuta',
      date: '2026/8/10',
    },
    {
      id: 3,
      title: '年度の途中で、日本人学校からインターに転校しました',
      schoolType: '転校',
      childStage: '小学生',
      profile: ['駐在員', '小5', '滞在延長'],
      reason: '赴任期間が延びることになり、残りの期間の過ごし方を考え直した。',
      concern: '日本語の学習をどう続けるか。通信教育を続けている。',
      author: 'K.S.',
      date: '2026/7/22',
    },
    {
      id: 4,
      title: '中学生の子。インターの見学で確認してよかったこと',
      schoolType: 'インター',
      childStage: '中高生',
      profile: ['帯同家族', '中2', '滞在予定2年'],
      reason: '見学で、同じ学年に日本人がいるか、英語サポートがどこまであるかを聞いて決めた。',
      concern: '帰国後の高校受験の仕組み（帰国生入試）を、日本側で調べる必要があった。',
      author: 'Aya',
      date: '2026/6/30',
    },
    {
      id: 5,
      title: '日系の幼稚園と、現地のプリスクールで迷った話',
      schoolType: '現地校',
      childStage: '未就学',
      profile: ['帯同家族', '4歳', '滞在予定3年'],
      reason: '家から近いことを優先して、現地のプリスクールにした。',
      concern: '日本語を話す機会が家だけになるので、週末に日本人の友だちと遊ぶ機会をつくっている。',
      author: 'Natsu',
      date: '2026/6/12',
    },
    {
      id: 6,
      title: 'スクールバスで片道1時間。通学時間をどう考えたか',
      schoolType: '日本人学校',
      childStage: '小学生',
      profile: ['駐在員', '小1・小3', '滞在予定3年'],
      reason: '住まいは会社に近いエリアで決まっていたので、通学時間は受け入れることにした。',
      concern: '朝がとても早い。バスの中で寝ていることが多い。',
      author: 'Hiro',
      date: '2026/5/18',
    },
  ],

  questions: [
    {
      title: 'グルガオンから日本人学校へのスクールバスは、朝何時ごろに出ますか？',
      answers: 3,
      tags: ['通学', '日本人学校'],
    },
    {
      title: 'インターの入学テスト、英語がほとんど話せない小学生でも受けられますか？',
      answers: 5,
      tags: ['入学・編入', 'インター'],
    },
    {
      title: '年度途中の編入、空き状況はいつ頃わかりますか？',
      answers: 2,
      tags: ['入学・編入'],
    },
    {
      title: 'インターで、学費以外にかかった費用を教えてください',
      answers: 4,
      tags: ['費用', 'インター'],
    },
    {
      title: '冬の大気汚染でのオンライン授業、どのくらいありましたか？',
      answers: 0,
      tags: ['時期・スケジュール'],
    },
  ],

  links: [
    {
      group: '公的機関',
      items: [
        {
          name: '文部科学省 CLARINET（海外子女教育）',
          url: 'https://www.mext.go.jp/a_menu/shotou/clarinet/',
          note: '日本人学校・補習授業校など、在外教育施設の制度について',
        },
        {
          name: '外務省 海外安全ホームページ（インド）',
          url: 'https://www.anzen.mofa.go.jp/',
          note: '治安・感染症などの安全情報',
        },
      ],
    },
    {
      group: '大使館',
      items: [
        {
          name: '在インド日本国大使館',
          url: 'https://www.in.emb-japan.go.jp/',
          note: '在留届、教育・生活に関するお知らせ',
        },
      ],
    },
    {
      group: '学校の公式サイト',
      items: [
        {
          name: 'ニューデリー日本人学校（サンプル）',
          url: '',
          note: '入学案内・スクールバス・学費（モックのためリンクは未設定）',
        },
        {
          name: '〇〇 International School（サンプル）',
          url: '',
          note: '入学案内・学費表（モックのためリンクは未設定）',
        },
      ],
    },
    {
      group: 'その他の一次情報',
      items: [
        {
          name: '海外子女教育振興財団（JOES）',
          url: 'https://www.joes.or.jp/',
          note: '海外での子どもの教育についての相談・資料',
        },
        {
          name: 'CBSE（インド中央中等教育委員会）',
          url: 'https://www.cbse.gov.in/',
          note: '現地校のカリキュラムについて',
        },
        {
          name: '国際バカロレア機構（IB）',
          url: 'https://www.ibo.org/',
          note: 'IB カリキュラムについて',
        },
      ],
    },
  ],

  giveaways: [
    { title: 'インターの制服（120cm）一式', place: 'グルガオン' },
    { title: '学習机と椅子', place: 'グルガオン' },
    { title: '日本の教科書・ドリル（小3）', place: 'デリー' },
  ],

  gathers: [{ title: '赴任・帰任前の家族向け 学校の情報交換会（サンプル）', date: '10月18日（土）' }],

  otherTopics: [
    { title: '学校選び', count: 28, current: true },
    { title: '日本語の学習・補習', count: 3, current: false },
    { title: '習い事・塾', count: 0, current: false },
    { title: '帰国時の学校の手続き', count: 0, current: false },
  ],
};
