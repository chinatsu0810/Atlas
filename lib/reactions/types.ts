// クライアントからも読むため、DBに依存しない定義だけをここに置く

export const REACTIONS = {
  insight: { emoji: '👀', label: 'なるほど' },
  helpful: { emoji: '👍', label: '参考になった' },
  same: { emoji: '🧳', label: 'わかる！' },
  want_to_know: { emoji: '🙋', label: '自分も聞きたい' },
} as const;

export type ReactionType = keyof typeof REACTIONS;

// リアクションを付けられる対象と、対象ごとに押せるリアクション（表示順）
export const REACTION_TARGETS = {
  experience: ['insight', 'helpful', 'same'],
  question: ['want_to_know'],
  answer: ['insight', 'helpful', 'same'],
} as const satisfies Record<string, readonly ReactionType[]>;

export type ReactionTarget = keyof typeof REACTION_TARGETS;

export type ReactionSummary = {
  // 1件もないリアクションは 0 で埋める
  counts: Partial<Record<ReactionType, number>>;
  // この閲覧者が押したリアクション
  reacted: ReactionType[];
};

export function isReactionTypeFor(
  target: ReactionTarget,
  value: string
): value is ReactionType {
  return (REACTION_TARGETS[target] as readonly string[]).includes(value);
}

// 例: experience → /api/experiences/12/reactions
export function reactionApiPath(target: ReactionTarget, targetId: number) {
  return `/api/${target}s/${targetId}/reactions`;
}
