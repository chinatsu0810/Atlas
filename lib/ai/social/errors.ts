// social workflow 関連のエラークラス。
//
// lib/ai/social/actions.ts は 'use server' ファイルであり、Next.jsの制約上
// async関数以外をexportできない（クラスをexportするとビルドエラーになる）ため、
// エラークラスはこの独立ファイルに切り出す。

export class SocialWorkflowUnauthorizedError extends Error {}
export class SocialWorkflowStateError extends Error {}
export class SocialWorkflowNotFoundError extends Error {}
