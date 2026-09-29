import type { GuideTarget } from './types';

// ガイド編集部の全員に共通する原則。スキルの作業指示の先頭に入れる
export const GUIDE_PRINCIPLES = `# 国・地域別まとめの原則
Atlasは、海外生活の悩みについて、散らばっている情報を整理する場所です。答えを決める場所ではありません。
- 「おすすめ」「正解」「一番」「〜すべき」のように、読者の代わりに判断しない。選ぶのは読者自身です。
- すべての情報に出典（発信元のページ）を付ける。出典のない情報は載せない。
- 大使館・公的機関・学校や施設の公式サイトなど、発信元がはっきりした一次情報を優先する。
- 金額・日付・条件は変わりうるので、出典の表記のまま扱い、推測で補わない。
- Atlasの経験談・Q&Aは個人の経験であり、公式情報と混ぜない。
- 特定の学校・施設・企業を持ち上げたり下げたりしない。選択肢は同じ観点で並べる。
- 読者向けの文章に、調べた過程を書かない（「今回」「確認できた範囲」「記載を確認できませんでした」「調査では」など）。分からないことは、書かない。`;

export function describeTarget(target: GuideTarget): string {
  return `# 対象
- 国: ${target.countryName}
- 地域: ${target.regionName}
- テーマ: ${target.themeLabel}（${target.themeHint}）`;
}

export function describeAtlasPosts(target: GuideTarget): string {
  if (target.atlasPostTitles.length === 0) {
    return '# このページにあるAtlasの経験談・Q&A\n（まだありません）';
  }

  return `# このページにあるAtlasの経験談・Q&A（タイトル。読者の関心の参考。事実の根拠には使わない）
${target.atlasPostTitles.map((title) => `- ${title}`).join('\n')}`;
}
