// Threads運用チームの入力検証とエラークラス。
//
// AI社員の呼び出し順序（リサーチ → 企画 → 執筆 → 検品、週次バッチ）は
// lib/ai/workflows/ のWorkflowが定義している。ここには、画面・APIが参照する
// 入力検証と、エラークラスだけを置く。

import {
  generateSocialDraftInputSchema,
  type GenerateSocialDraftInput,
} from './types';

export class SocialDraftValidationError extends Error {}
export class SocialDraftGenerationError extends Error {}

export function validateGenerateSocialDraftInput(
  rawInput: unknown
): GenerateSocialDraftInput {
  const parsed = generateSocialDraftInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? '入力内容を確認してください';

    throw new SocialDraftValidationError(message);
  }

  return parsed.data;
}
