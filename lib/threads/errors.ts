// Threads連携のエラークラス（lib/threads/actions.ts は 'use server' のため、クラスは別ファイルに置く）

export class ThreadsNotConfiguredError extends Error {}

// 未連携・トークンの失効・復号できない、など。再連携が必要な状態
export class ThreadsNotConnectedError extends Error {}

// 分析できる投稿がない
export class ThreadsNoDataError extends Error {}
