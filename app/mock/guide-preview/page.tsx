import type { Metadata } from 'next';
import { GuideSummary } from '@/components/places/guide-summary';
import type { GuideContent } from '@/lib/ai/guides/types';

// 国・地域別まとめの「見え方」を確かめるための確認用ページ。中身はサンプル（実際の学校情報ではない）
export const metadata: Metadata = {
  title: 'まとめの見え方（サンプル）',
  robots: { index: false, follow: false },
};

const sample: GuideContent = {
  lead: 'デリー / グルガオンから通える学校を、種類ごとに同じ項目で比べられます。',
  highlights: [
    { text: '日本人学校はデリー市内にあり、グルガオンからはスクールバスで通う家庭があります。（サンプル）', sourceIds: [1] },
    { text: '学年の始まりは学校の種類によって異なります。（サンプル）', sourceIds: [2, 3] },
    { text: '冬は大気汚染の状況により、休校やオンライン授業になることがあります。（サンプル）', sourceIds: [4] },
  ],
  comparison: {
    title: '学校の種類',
    attributes: ['授業の言語', 'カリキュラム', '学年の始まり', '対象の年齢'],
    options: [
      {
        name: '日本人学校',
        summary: { text: '日本の学習指導要領に沿って、日本語で授業を行う学校。', sourceIds: [2] },
        cells: [
          { text: '日本語', sourceIds: [2] },
          { text: '日本の学習指導要領', sourceIds: [2] },
          { text: '4月', sourceIds: [2] },
          { text: '小学部・中学部', sourceIds: [2] },
        ],
        linkSourceId: 2,
      },
      {
        name: 'インターナショナルスクール',
        summary: { text: '英語で授業を行い、国際的なカリキュラムを採用する学校。', sourceIds: [3] },
        cells: [
          { text: '英語', sourceIds: [3] },
          { text: 'IB・ケンブリッジなど（学校による）', sourceIds: [3] },
          { text: '8月ごろ', sourceIds: [3] },
          { text: '', sourceIds: [] },
        ],
        linkSourceId: 3,
      },
      {
        name: '現地の私立校',
        summary: { text: 'インドの教育制度に沿った学校。', sourceIds: [5] },
        cells: [
          { text: '英語が中心', sourceIds: [5] },
          { text: 'CBSE・ICSE など', sourceIds: [5] },
          { text: '4月', sourceIds: [5] },
          { text: '幼児〜高校', sourceIds: [5] },
        ],
        linkSourceId: 5,
      },
    ],
  },
  topics: [
    {
      heading: '費用',
      items: [
        { text: '授業料のほかに、入学金・施設費・スクールバス代がかかる学校があります。（サンプル）', sourceIds: [3] },
        { text: '金額は年度ごとに改定され、各校が学費表を公開しています。（サンプル）', sourceIds: [3] },
      ],
    },
    {
      heading: '入学・編入',
      items: [
        { text: '在学証明書・成績証明書・予防接種の記録などを求める学校があります。（サンプル）', sourceIds: [3] },
        { text: '年度途中の編入は、学年ごとの空き状況によります。（サンプル）', sourceIds: [2] },
      ],
    },
  ],
  sources: [
    { id: 1, url: 'https://www.in.emb-japan.go.jp/', title: '在インド日本国大使館（サンプル）', kind: 'embassy' },
    { id: 2, url: 'https://example.com/japanese-school', title: '日本人学校 公式サイト（サンプル）', kind: 'school' },
    { id: 3, url: 'https://example.com/international-school', title: '〇〇 International School（サンプル）', kind: 'school' },
    { id: 4, url: 'https://www.anzen.mofa.go.jp/', title: '外務省 海外安全ホームページ（サンプル）', kind: 'government' },
    { id: 5, url: 'https://www.cbse.gov.in/', title: 'CBSE（サンプル）', kind: 'government' },
  ],
};

export default function GuidePreviewPage() {
  return (
    <main className="min-h-screen bg-[#F8FBFD] px-4 pb-14 pt-6 text-[#123B5D] md:px-6">
      <div className="mx-auto max-w-[960px]">
        <p className="mb-4 rounded-lg bg-[#FFFBF2] px-3 py-2 text-xs text-[#8A5A12]">
          見え方の確認用です。中身はサンプルで、実際の学校情報ではありません。
        </p>
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">デリー / グルガオンの学校・教育</h1>
        <GuideSummary content={sample} publishedAt={new Date()} />
      </div>
    </main>
  );
}
