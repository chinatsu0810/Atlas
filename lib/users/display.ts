// 投稿の作者名の表示。仕様は docs/account-deletion.md を参照。
// 退会したユーザーは、名前が残っていても表示せず「退会したユーザー」にする。

export const DELETED_USER_NAME = '退会したユーザー';
export const ANONYMOUS_USER_NAME = '匿名';

export function displayAuthorName(
  name: string | null | undefined,
  deletedAt: Date | null | undefined
): string {
  if (deletedAt) {
    return DELETED_USER_NAME;
  }

  return name || ANONYMOUS_USER_NAME;
}
