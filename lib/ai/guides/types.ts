// 「国・地域別まとめ」（/places の国×地域×テーマのページ上部に出す、公式情報などのまとめ）の型。
// AI社員（ガイド編集部）が 企画 →（会長の確認）→ 調査 → 正誤チェック → 執筆 → 審査 の順に作り、
// 会長が確認・手直ししてから公開する。
//
// まとめは4つの部品でできている:
//   ① まず知っておきたいこと（要点）
//   ② 比べる（選択肢ごとのカード。全カードが同じ項目を同じ順で持つ）。比べるものが無いテーマでは無し
//   ③ テーマ別の情報（「費用」「入学・編入」などのカード）
//   ④ 出典（公式情報など。種類つき）

import { z } from 'zod';

// 作業の段階。いまの段階は「次に実行する（または実行中の）作業」を表す。
// 失敗したときは段階を進めず、error に理由を残す（同じ段階からやり直せる）
export const GUIDE_STATUSES = [
  'planning',
  'plan_review',
  'researching',
  'checking',
  'writing',
  'reviewing',
  'pending_review',
  'published',
] as const;

export type GuideStatus = (typeof GUIDE_STATUSES)[number];

export const GUIDE_STATUS_LABELS: Record<GuideStatus, string> = {
  planning: '企画',
  plan_review: '企画の確認待ち',
  researching: '調査',
  checking: '正誤チェック',
  writing: '執筆',
  reviewing: '審査',
  pending_review: '本文の確認待ち',
  published: '公開中',
};

// まとめ1本あたりのトークンの予算（読んだ量＋書いた量）。超えたら自動では進めず、会長の確認を待つ
export const TOKEN_BUDGET_PER_GUIDE = 300_000;

export const GUIDE_BUDGET_ERROR = `予算（${TOKEN_BUDGET_PER_GUIDE.toLocaleString('ja-JP')}トークン）に達したため、止まっています。続けるかどうかを選んでください。`;

// AIが自動で進める段階（会長の確認待ち・公開中は、人が操作するまで止まる）
export const AUTO_STEPS: GuideStatus[] = ['planning', 'researching', 'checking', 'writing', 'reviewing'];

// 出典の種類。ページでは、Atlasの経験談と混ざらないよう種類を明示する
export const SOURCE_KINDS = ['government', 'embassy', 'school', 'organization', 'media', 'other'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  government: '公的機関',
  embassy: '大使館・領事館',
  school: '学校・施設の公式',
  organization: '団体',
  media: '報道・情報サイト',
  other: 'その他',
};

// 調査の情報が、まとめのどこに入るか（テーマ別の情報は、その見出しの key）
export const HIGHLIGHT_SECTION = 'highlights';
export const COMPARISON_SECTION = 'comparison';

// ---------------------------------------------------------------
// 企画（編集長）。会長が確認・手直ししてから調査に進む
// ---------------------------------------------------------------

export const guidePlanSchema = z.object({
  // 比べる選択肢と項目（比べるものが無いテーマでは null）
  comparison: z
    .object({
      title: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      attributes: z.array(z.string().min(1)).min(1),
    })
    .nullable(),
  // テーマ別の情報の見出しと、調べる問い
  topics: z.array(
    z.object({
      key: z.string().min(1),
      heading: z.string().min(1),
      questions: z.array(z.string()),
    })
  ),
});

export type GuidePlan = z.infer<typeof guidePlanSchema>;

// ---------------------------------------------------------------
// 調査（リサーチャー）
// ---------------------------------------------------------------

export const researchOutputSchema = z.object({
  facts: z.array(
    z.object({
      // HIGHLIGHT_SECTION / COMPARISON_SECTION / テーマ別の見出しの key
      section: z.string(),
      // 比べるカードの情報のときだけ、選択肢と項目の名前（企画と同じ表記）。それ以外は空文字
      option: z.string(),
      attribute: z.string(),
      claim: z.string().min(1),
      sourceUrl: z.string().min(1),
      sourceKind: z.enum(SOURCE_KINDS),
    })
  ),
});

export type ResearchOutput = z.infer<typeof researchOutputSchema>;

export type GuideSource = {
  id: number;
  url: string;
  title: string;
  kind: SourceKind;
  // 調査のときに検索結果から引用された部分（正誤チェックで、ページを開かずに照らし合わせる）
  excerpts?: string[];
};

export type GuideFact = {
  id: number;
  section: string;
  option: string;
  attribute: string;
  claim: string;
  sourceId: number;
};

// DBに保存する調査結果。出典は「Web検索・取得で実際に返ってきたURL」だけに絞ってある
export type GuideResearch = {
  facts: GuideFact[];
  sources: GuideSource[];
  // 出典のURLが実際の検索結果に無かったため、捨てた情報の数
  droppedCount: number;
};

// ---------------------------------------------------------------
// 正誤チェック（ファクトチェッカー）
// ---------------------------------------------------------------

export const FACT_VERDICTS = ['confirmed', 'mismatch', 'unverifiable'] as const;
export type FactVerdict = (typeof FACT_VERDICTS)[number];

export const FACT_VERDICT_LABELS: Record<FactVerdict, string> = {
  confirmed: '確認済み',
  mismatch: '出典と合わない',
  unverifiable: '確認できない',
};

export const factCheckOutputSchema = z.object({
  results: z.array(
    z.object({
      factId: z.number().int(),
      verdict: z.enum(FACT_VERDICTS),
      note: z.string(),
    })
  ),
});

export type FactCheckOutput = z.infer<typeof factCheckOutputSchema>;

// ---------------------------------------------------------------
// 執筆（ライター）・公開する中身
// ---------------------------------------------------------------

const writtenItem = z.object({ text: z.string(), factIds: z.array(z.number().int()) });

export const writingOutputSchema = z.object({
  lead: z.string(),
  highlights: z.array(writtenItem),
  comparison: z
    .array(
      z.object({
        option: z.string(),
        summary: writtenItem,
        cells: z.array(z.object({ attribute: z.string(), text: z.string(), factIds: z.array(z.number().int()) })),
      })
    )
    .nullable(),
  topics: z.array(z.object({ key: z.string(), heading: z.string(), items: z.array(writtenItem) })),
});

export type WritingOutput = z.infer<typeof writingOutputSchema>;

const contentItem = z.object({ text: z.string(), sourceIds: z.array(z.number().int()) });

export type GuideItem = z.infer<typeof contentItem>;

// ページに表示する中身。出典の一覧を中に持ち、これだけで表示できるようにする
export const guideContentSchema = z.object({
  lead: z.string(),
  highlights: z.array(contentItem),
  comparison: z
    .object({
      title: z.string(),
      // すべてのカードが、この順で項目を持つ
      attributes: z.array(z.string()),
      options: z.array(
        z.object({
          name: z.string(),
          summary: contentItem,
          // attributes と同じ順・同じ数。分からない項目は text が空
          cells: z.array(contentItem),
          // その選択肢の公式サイト（出典の id）。無ければ null
          linkSourceId: z.number().int().nullable(),
        })
      ),
    })
    .nullable(),
  topics: z.array(z.object({ heading: z.string(), items: z.array(contentItem) })),
  sources: z.array(
    z.object({
      id: z.number().int(),
      url: z.string(),
      title: z.string(),
      kind: z.enum(SOURCE_KINDS),
    })
  ),
});

export type GuideContent = z.infer<typeof guideContentSchema>;

// ---------------------------------------------------------------
// 審査（審査役）
// ---------------------------------------------------------------

export const reviewOutputSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.object({ where: z.string(), problem: z.string(), suggestion: z.string() })),
});

export type ReviewOutput = z.infer<typeof reviewOutputSchema>;

// ---------------------------------------------------------------
// Workflowに渡す、まとめの対象
// ---------------------------------------------------------------

export type GuideTarget = {
  countryName: string;
  regionName: string;
  themeLabel: string;
  themeHint: string;
  // そのページにあるAtlasの経験談・Q&Aのタイトル（企画の参考。事実の根拠には使わない）
  atlasPostTitles: string[];
};

// ---------------------------------------------------------------
// 費用の記録（段階を1回実行するごとに1件）
// ---------------------------------------------------------------

export type GuideUsageEntry = {
  step: GuideStatus;
  at: string;
  // その段階でAIを呼んだ回数
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  webSearches: number;
  webFetches: number;
  // 公開価格から計算した目安（lib/ai/core/usage.ts）
  costUsd: number;
};

// これまでに使ったトークン（読んだ量＋書いた量）
export function usedTokens(usage: GuideUsageEntry[]): number {
  return usage.reduce(
    (total, entry) =>
      total + entry.inputTokens + entry.cacheCreationTokens + entry.cacheReadTokens + entry.outputTokens,
    0
  );
}
