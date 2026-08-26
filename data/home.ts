export type Post = {
  id: string;
  title: string;
  country: string;
  flag: string;
  city: string;
  category: string;
  replies: number;
  views: number;
  solved: boolean;
  createdAt: string;
  hasExpertAnswer: boolean;
};

export const posts: Post[] = [
  {
    id: "1",
    title: "赴任前でもオーストラリアの銀行口座は作れますか？",
    country: "Australia",
    flag: "🇦🇺",
    city: "Sydney",
    category: "海外赴任",
    replies: 18,
    views: 1240,
    solved: true,
    createdAt: "2日前",
    hasExpertAnswer: true,
  },
  {
    id: "2",
    title: "アメリカでおすすめの日本人小学校はありますか？",
    country: "United States",
    flag: "🇺🇸",
    city: "Los Angeles",
    category: "海外子育て",
    replies: 12,
    views: 890,
    solved: false,
    createdAt: "5時間前",
    hasExpertAnswer: false,
  },
  {
    id: "3",
    title: "シンガポールで家探しをする時の注意点",
    country: "Singapore",
    flag: "🇸🇬",
    city: "Singapore",
    category: "移住",
    replies: 26,
    views: 2105,
    solved: true,
    createdAt: "1週間前",
    hasExpertAnswer: true,
  },
  {
    id: "4",
    title: "カナダ留学で最初に契約するべき携帯会社は？",
    country: "Canada",
    flag: "🇨🇦",
    city: "Toronto",
    category: "留学",
    replies: 9,
    views: 542,
    solved: false,
    createdAt: "昨日",
    hasExpertAnswer: false,
  },
  {
    id: "5",
    title: "ドイツで日本の運転免許は切り替えできますか？",
    country: "Germany",
    flag: "🇩🇪",
    city: "Berlin",
    category: "生活",
    replies: 15,
    views: 1318,
    solved: true,
    createdAt: "3日前",
    hasExpertAnswer: true,
  },
];