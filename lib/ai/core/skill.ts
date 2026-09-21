// 「何ができるか」を定義するSkill層。EmployeeとSkillは独立しており、
// 1つのEmployeeが複数のSkillを持てる。将来的に別のEmployeeが同じSkillを
// 再利用できるようにするため、SkillはEmployeeを知らず、汎用的な入出力の
// 形だけを定義する。
//
// runSkill() は、Employeeの人格（buildEmployeePersona）とSkillの作業指示を
// 組み合わせてClaudeを呼び出し、構造化出力を検証して返す共通処理。
// 旧 lib/ai/social/service.ts の callClaudeForJson を汎用化したもの。

import Anthropic from '@anthropic-ai/sdk';
import type { ZodType } from 'zod';

import type { Employee } from './employee';
import { buildEmployeePersona } from './employee';

export const DEFAULT_SKILL_MODEL = 'claude-opus-5';

// Skill実行中に起きたエラーの汎用クラス。
// チーム固有のエラークラス（例: SocialDraftGenerationError）への変換は
// 呼び出し元（各チームのservice.ts等）の責務とする。
export class SkillCallError extends Error {}

// クライアントは、実際にAIを呼ぶ時点で作る。読み込み時（import時）にAPIキーの有無を検査すると、
// キーが未設定の環境（Vercelのプレビューなど）で、AIと無関係なページも含めてビルドが失敗するため。
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('runSkill: ANTHROPIC_API_KEY environment variable is not set');

    throw new SkillCallError(
      'AIサービスが設定されていません（ANTHROPIC_API_KEY）。管理者に連絡してください。'
    );
  }

  anthropicClient = new Anthropic({ apiKey });

  return anthropicClient;
}

export type SkillContext<TInput> = {
  employee: Employee;
  input: TInput;
};

export type Skill<TInput, TOutput> = {
  id: string;
  model?: string;
  maxTokens?: number;
  // Employeeの人格に続けて出力する、Skill固有の作業指示（出力形式の説明を含む）
  buildTaskInstructions: (ctx: SkillContext<TInput>) => string;
  buildUserPrompt: (ctx: SkillContext<TInput>) => string;
  jsonSchema: Record<string, unknown>;
  outputSchema: ZodType<TOutput>;
};

// 入出力の型が異なるSkillを1つの一覧（割り当て表など）で扱うための型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySkill = Skill<any, any>;

// 思考の深さ。低いほど速く安い（思考トークンも max_tokens に含まれるため、切れにくくもなる）。
// 指定しない場合はAPIの既定（high）で動く。
export type SkillEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type RunSkillOptions = {
  effort?: SkillEffort;
};

export async function runSkill<TInput, TOutput>(
  skill: Skill<TInput, TOutput>,
  employee: Employee,
  input: TInput,
  options: RunSkillOptions = {}
): Promise<TOutput> {
  const ctx: SkillContext<TInput> = { employee, input };

  const system = `${buildEmployeePersona(employee)}

${skill.buildTaskInstructions(ctx)}`;

  const client = getAnthropicClient();

  let response: Anthropic.Message;

  try {
    response = await client.messages.create({
      model: skill.model ?? DEFAULT_SKILL_MODEL,
      max_tokens: skill.maxTokens ?? 8192,
      system,
      messages: [{ role: 'user', content: skill.buildUserPrompt(ctx) }],
      output_config: {
        format: { type: 'json_schema', schema: skill.jsonSchema },
        ...(options.effort ? { effort: options.effort } : {}),
      },
    });
  } catch (error) {
    // ユーザー向けには一般的な文言にするため、原因の調査用に詳細をサーバーログへ残す
    console.error(`runSkill(${skill.id}): Anthropic API call failed`, error);

    if (error instanceof Anthropic.AuthenticationError) {
      throw new SkillCallError(
        'AIサービスの認証に失敗しました。管理者に連絡してください。'
      );
    }

    if (error instanceof Anthropic.RateLimitError) {
      throw new SkillCallError(
        '現在アクセスが集中しています。しばらくしてからもう一度お試しください。'
      );
    }

    // 残高不足は 400（invalid_request_error）で返ってくる。再試行しても直らないので、専用の文言にする
    if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) {
      throw new SkillCallError(
        'AIサービスの利用残高が不足しています。管理者に連絡してください。'
      );
    }

    if (error instanceof Anthropic.APIError) {
      throw new SkillCallError('AIとの通信に失敗しました。もう一度お試しください。');
    }

    throw new SkillCallError('AI呼び出し中に予期しないエラーが発生しました。');
  }

  if (response.stop_reason === 'refusal') {
    throw new SkillCallError(
      'この内容は生成できませんでした。入力内容を見直してもう一度お試しください。'
    );
  }

  if (response.stop_reason === 'max_tokens') {
    console.error(`runSkill(${skill.id}): response truncated at max_tokens`, response.usage);

    throw new SkillCallError(
      '生成結果が長すぎて途中で切れてしまいました。もう一度お試しください。'
    );
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (!textBlock) {
    throw new SkillCallError('生成結果を読み取れませんでした。もう一度お試しください。');
  }

  let raw: unknown;

  try {
    raw = JSON.parse(textBlock.text);
  } catch {
    console.error(`runSkill(${skill.id}): failed to parse JSON. Raw text:`, textBlock.text);

    throw new SkillCallError('生成結果を解析できませんでした。もう一度お試しください。');
  }

  const parsed = skill.outputSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(`runSkill(${skill.id}): output schema mismatch`, parsed.error);

    throw new SkillCallError('生成結果の形式が想定と異なりました。もう一度お試しください。');
  }

  return parsed.data;
}
