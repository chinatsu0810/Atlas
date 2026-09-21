// 保存済みのKPI分析を、週次の投稿作成（テーマ選定・企画）に渡す「参考情報」の文章にする。
//
// 分析はサンプルが小さく（数十件の投稿、反応は一桁のことも多い）、分析担当の仮説を含む。
// そのため、事実として扱わせず、あくまで参考にとどめること、テーマを偏らせないことを、
// 文章の冒頭で明示する。分析の数字は、投稿の文面に書かせない。

import type { KpiReport } from './reports';

const MAX_ITEMS_PER_LIST = 4;
const MAX_ITEM_LENGTH = 160;
const MAX_EXAMPLE_POSTS = 3;
const MAX_NOTE_LENGTH = 3500;

const formatDate = (date: Date) =>
  date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' });

const clip = (text: string) =>
  text.length > MAX_ITEM_LENGTH ? `${text.slice(0, MAX_ITEM_LENGTH)}…` : text;

function section(label: string, items: string[]): string {
  if (items.length === 0) return '';

  return `- ${label}:\n${items
    .slice(0, MAX_ITEMS_PER_LIST)
    .map((item) => `  - ${clip(item)}`)
    .join('\n')}`;
}

export function buildAnalysisNote(report: KpiReport): string {
  const { thisWeekTotals } = report.snapshot;

  const examples = [...report.snapshot.thisWeek]
    .map((post) => ({ post, reactions: post.likes + post.replies + post.reposts + post.quotes }))
    .filter((item) => item.reactions > 0)
    .sort((a, b) => b.reactions - a.reactions)
    .slice(0, MAX_EXAMPLE_POSTS)
    .map(
      ({ post }) =>
        `「${post.text.slice(0, 40)}${post.text.length > 40 ? '…' : ''}」（閲覧${post.views}・いいね${post.likes}・返信${post.replies}・リポスト${post.reposts}）`
    );

  const note = [
    `運営のThreadsアカウントの分析（${formatDate(report.createdAt)}実施。対象: ${report.period}）。`,
    `【取り扱い】サンプルが小さく（今週の投稿${thisWeekTotals.posts}件、反応があった投稿${thisWeekTotals.reactedPosts}件）、` +
      '以下は分析担当の仮説を含みます。事実として扱わず、テーマ・切り口・書き出しを考えるときの「参考」にとどめてください。' +
      'この傾向にテーマを偏らせず、多様性を優先してください。分析の数字は、投稿の文面に書かないでください。',
    `- 主な数字（今週の投稿分）: 投稿${thisWeekTotals.posts}件 / 閲覧${thisWeekTotals.views} / いいね${thisWeekTotals.likes} / 返信${thisWeekTotals.replies} / リポスト${thisWeekTotals.reposts}`,
    examples.length > 0 ? `- 反応があった投稿の例（今週）:\n${examples.map((example) => `  - ${example}`).join('\n')}` : '',
    section('良い傾向', report.review.highlights),
    section('懸念', report.review.concerns),
    section('仮説（未検証）', report.review.hypotheses),
    section('改善の材料', report.review.improvementIdeas),
  ]
    .filter(Boolean)
    .join('\n');

  return note.length > MAX_NOTE_LENGTH ? `${note.slice(0, MAX_NOTE_LENGTH)}…` : note;
}
