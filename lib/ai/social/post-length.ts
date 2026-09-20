// Threads投稿の文字数の考え方。
//
// 推奨は150〜300文字、上限は500文字。Threadsは記事ではなく、全部を伝える必要はない。
// 実際に投稿されるのは本文とハッシュタグをあわせたテキストなので、上限はハッシュタグを
// 含めて数える（コピー機能が出力する形式と同じ）。

export const RECOMMENDED_POST_LENGTH_MIN = 150;
export const RECOMMENDED_POST_LENGTH_MAX = 300;
export const MAX_POST_LENGTH = 500;

export function countPostLength(draft: string, hashtags: string[]): number {
  if (hashtags.length === 0) return draft.length;

  // 本文とハッシュタグの間の空行（2文字）＋ハッシュタグをスペースでつないだもの
  return draft.length + 2 + hashtags.join(' ').length;
}
