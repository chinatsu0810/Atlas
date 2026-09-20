// management系のエラークラス。
//
// lib/ai/management/actions.ts は 'use server' ファイルであり、Next.jsの制約上
// async関数以外をexportできない（クラスをexportするとビルドエラーになる）ため、
// エラークラスはこの独立ファイルに切り出す（lib/ai/social/errors.ts と同じ理由）。

export class MeetingUnauthorizedError extends Error {}
export class MeetingStateError extends Error {}
export class MeetingNotFoundError extends Error {}
export class MeetingValidationError extends Error {}

// AI呼び出しに失敗した（APIエラー・出力形式の不一致など）
export class MeetingGenerationError extends Error {}
