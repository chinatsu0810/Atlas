// Webで調べてから答えるスキルの実行（Web検索・Web取得）。
//
// 1回目: Web検索・Web取得のツールを持たせて調べさせ、分かったことを出典つきのメモとして書かせる。
//        このとき、検索結果・取得したページとして実際に返ってきたURLを、プログラム側で記録する。
// 2回目: そのメモと「実際に取得できたURLの一覧」を渡し、スキルの出力形式（JSON）で答えさせる。
//
// 2回に分けるのは、構造化出力（output_config.format）と出典情報（citations）の組み合わせが
// APIでエラーになることがあるため。出典は「実際に取得できたURL」に限ることを、
// 呼び出し側（Workflow）が webSources と照らし合わせて強制する。

import Anthropic from '@anthropic-ai/sdk';

import {
  DEFAULT_SKILL_MODEL,
  SkillCallError,
  buildSkillSystemPrompt,
  getAnthropicClient,
  requestSkillOutput,
  toSkillCallError,
  type RunSkillOptions,
  type Skill,
  type SkillContext,
} from './skill';
import type { Employee } from './employee';
import { fromApiUsage } from './usage';

export type WebSource = {
  url: string;
  title: string;
  // AIがメモの根拠として引用した、そのページの一部（検索結果の引用）。正誤チェックでページを開かずに照らし合わせるのに使う
  excerpts: string[];
};

export type WebToolLimits = {
  // Web検索の最大回数（0 または省略で使わない）
  searches?: number;
  // Webページ取得の最大回数（0 または省略で使わない）。取得できるのは、会話に出てきたURLだけ
  fetches?: number;
  // 取得した1ページから読む量の上限（トークン）。長いページで費用がふくらまないようにする
  fetchContentTokens?: number;
};

const DEFAULT_FETCH_CONTENT_TOKENS = 8_000;

// 1ページについて取っておく引用の数と長さ
const MAX_EXCERPTS_PER_SOURCE = 5;
const MAX_EXCERPT_LENGTH = 300;

export type WebSkillResult<TOutput> = {
  output: TOutput;
  // 検索結果・取得したページとして、実際に返ってきたURL
  webSources: WebSource[];
};

// サーバー側のツール実行が上限に達すると pause_turn で止まる。続きを頼む回数の上限
// （続きを頼むたびに、それまでの検索結果をすべて読み直すので、費用がふくらむ）
const MAX_CONTINUATIONS = 2;

const RESEARCH_PHASE_NOTE = `# いまの段階
まずWebで調べてください。この段階ではJSONを出力しません。
調べ終えたら、分かったことを箇条書きのメモにしてください。各項目の末尾に、根拠にしたページのURLを必ず書きます。
確認できなかったことは「確認できなかった」と書き、推測で埋めないでください。`;

function collectSources(content: Anthropic.ContentBlock[], into: Map<string, WebSource>) {
  for (const block of content) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (!into.has(result.url)) into.set(result.url, { url: result.url, title: result.title, excerpts: [] });
      }
    }

    if (block.type === 'web_fetch_tool_result' && block.content.type === 'web_fetch_result') {
      const { url } = block.content;
      const title = block.content.content.title ?? url;
      // 検索結果より、実際に取得したページのタイトルを優先する
      into.set(url, { url, title, excerpts: into.get(url)?.excerpts ?? [] });
    }

    // メモの根拠として引用された部分を、そのページの引用として取っておく
    if (block.type === 'text') {
      for (const citation of block.citations ?? []) {
        if (citation.type !== 'web_search_result_location') continue;
        const source = into.get(citation.url);
        const excerpt = citation.cited_text.trim().slice(0, MAX_EXCERPT_LENGTH);
        if (source && excerpt && !source.excerpts.includes(excerpt) && source.excerpts.length < MAX_EXCERPTS_PER_SOURCE) {
          source.excerpts.push(excerpt);
        }
      }
    }
  }
}

export async function runWebSkill<TInput, TOutput>(
  skill: Skill<TInput, TOutput>,
  employee: Employee,
  input: TInput,
  limits: WebToolLimits,
  options: RunSkillOptions = {}
): Promise<WebSkillResult<TOutput>> {
  const ctx: SkillContext<TInput> = { employee, input };
  const system = buildSkillSystemPrompt(skill, ctx, options);
  const userPrompt = skill.buildUserPrompt(ctx);

  const tools: Anthropic.ToolUnion[] = [];
  if (limits.searches) {
    tools.push({ type: 'web_search_20260209', name: 'web_search', max_uses: limits.searches });
  }
  if (limits.fetches) {
    tools.push({
      type: 'web_fetch_20260209',
      name: 'web_fetch',
      max_uses: limits.fetches,
      max_content_tokens: limits.fetchContentTokens ?? DEFAULT_FETCH_CONTENT_TOKENS,
    });
  }

  const client = getAnthropicClient();
  const model = skill.model ?? DEFAULT_SKILL_MODEL;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];
  const sources = new Map<string, WebSource>();
  const notes: string[] = [];

  for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
    let response: Anthropic.Message;

    try {
      response = await client.messages.create({
        model,
        max_tokens: 16000,
        system: `${system}\n\n${RESEARCH_PHASE_NOTE}`,
        messages,
        tools,
        ...(options.effort ? { output_config: { effort: options.effort } } : {}),
      });
    } catch (error) {
      throw toSkillCallError(skill.id, error);
    }

    options.onUsage?.(fromApiUsage(model, response.usage));

    if (response.stop_reason === 'refusal') {
      throw new SkillCallError('この内容は調べられませんでした。入力内容を見直してください。');
    }

    collectSources(response.content, sources);
    for (const block of response.content) {
      if (block.type === 'text') notes.push(block.text);
    }

    if (response.stop_reason !== 'pause_turn') break;

    // 続きから再開してもらう（「続けて」などの発言は足さない）
    messages.push({ role: 'assistant', content: response.content });
  }

  const webSources = [...sources.values()];
  const sourceList =
    webSources.length === 0
      ? '（取得できたページはありません）'
      : webSources.map((source, index) => `${index + 1}. ${source.title}\n   ${source.url}`).join('\n');

  const output = await requestSkillOutput(
    skill,
    system,
    `${userPrompt}

# Web調査のメモ
${notes.join('\n').trim() || '（メモはありません）'}

# 実際に取得できたページ（出典には、この一覧のURLだけを使うこと）
${sourceList}`,
    options
  );

  return { output, webSources };
}
