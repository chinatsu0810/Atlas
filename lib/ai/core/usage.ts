// AI呼び出し1回分の使用量と、その費用の目安。
// 料金は、Anthropic が公開している価格（2026年9月時点）。価格が変わったら MODEL_PRICES と WEB_SEARCH_USD を直す。
// 請求の正確な額は、Anthropic の管理画面（Claude Console の Usage / Cost）で確認する。

import type Anthropic from '@anthropic-ai/sdk';

export type SkillUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  webSearches: number;
  webFetches: number;
};

// 100万トークンあたりのドル
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
};

// 価格表に無いモデルは、高めに見積もる（Opus と同じ）
const FALLBACK_PRICE = { input: 5, output: 25 };

// Web検索は1,000回あたり10ドル。Web取得は、読んだ分のトークン代だけで追加料金は無い
const WEB_SEARCH_USD = 10 / 1000;

// 画面に円で出すときの目安のレート
export const USD_TO_JPY = 150;

export function fromApiUsage(model: string, usage: Anthropic.Usage): SkillUsage {
  return {
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    webSearches: usage.server_tool_use?.web_search_requests ?? 0,
    webFetches: usage.server_tool_use?.web_fetch_requests ?? 0,
  };
}

export function estimateCostUsd(usage: SkillUsage): number {
  const price = MODEL_PRICES[usage.model] ?? FALLBACK_PRICE;
  const perToken = (dollarsPerMillion: number) => dollarsPerMillion / 1_000_000;

  return (
    usage.inputTokens * perToken(price.input) +
    // キャッシュへの書き込みは入力の1.25倍、読み出しは0.1倍
    usage.cacheCreationTokens * perToken(price.input) * 1.25 +
    usage.cacheReadTokens * perToken(price.input) * 0.1 +
    usage.outputTokens * perToken(price.output) +
    usage.webSearches * WEB_SEARCH_USD
  );
}

export function sumUsage(items: SkillUsage[]): Omit<SkillUsage, 'model'> {
  return items.reduce(
    (total, item) => ({
      inputTokens: total.inputTokens + item.inputTokens,
      outputTokens: total.outputTokens + item.outputTokens,
      cacheCreationTokens: total.cacheCreationTokens + item.cacheCreationTokens,
      cacheReadTokens: total.cacheReadTokens + item.cacheReadTokens,
      webSearches: total.webSearches + item.webSearches,
      webFetches: total.webFetches + item.webFetches,
    }),
    { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, webSearches: 0, webFetches: 0 }
  );
}
