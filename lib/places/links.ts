import type { Place, ThemeKey } from './data';

export type OfficialLink = { name: string; owner: string; url: string };

// どの国・テーマでも出す、公的機関のリンク
const COMMON: OfficialLink[] = [
  { name: '海外安全ホームページ', owner: '外務省', url: 'https://www.anzen.mofa.go.jp/' },
  {
    name: '在外公館リスト（大使館・総領事館）',
    owner: '外務省',
    url: 'https://www.mofa.go.jp/mofaj/annai/zaigai/list/index.html',
  },
];

// 国ごとの大使館。分かっている国だけ載せ、ほかの国は在外公館リストから探してもらう
const EMBASSIES: Record<string, OfficialLink> = {
  in: { name: '在インド日本国大使館', owner: '外務省', url: 'https://www.in.emb-japan.go.jp/' },
};

const BY_THEME: Partial<Record<ThemeKey, OfficialLink[]>> = {
  education: [
    {
      name: '海外子女教育（CLARINET）',
      owner: '文部科学省',
      url: 'https://www.mext.go.jp/a_menu/shotou/clarinet/',
    },
    { name: '海外子女教育振興財団（JOES）', owner: '公益財団法人', url: 'https://www.joes.or.jp/' },
  ],
  medical: [
    {
      name: '世界の医療事情',
      owner: '外務省',
      url: 'https://www.mofa.go.jp/mofaj/toko/medi/index.html',
    },
  ],
  visa: [{ name: '在留届（ORRnet）', owner: '外務省', url: 'https://www.ezairyu.mofa.go.jp/' }],
  moving: [{ name: '在留届（ORRnet）', owner: '外務省', url: 'https://www.ezairyu.mofa.go.jp/' }],
};

export function officialLinksFor(place: Place, theme?: ThemeKey): OfficialLink[] {
  const embassy = EMBASSIES[place.slug];
  return [...(theme ? BY_THEME[theme] ?? [] : []), ...(embassy ? [embassy] : []), ...COMMON];
}
