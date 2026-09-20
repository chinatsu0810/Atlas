// Workflow「Threads週次バッチ」：リサーチ担当が今週のテーマ・想定読者を見立て、
// それぞれについて投稿作成Workflow（social-post-pipeline）を実行する。
//
// Threadsの実データを取得する手段はまだない。運営が渡した観測メモがあればそれに基づいて選び、
// なければAIの知識・推論による見立て（仮説）で選ぶ（将来的にThreads／Web検索の連携へ移行する計画あり）。
// 担当者がボタンを押したときのみ実行される。

import { socialResearcherEmployee } from '@/lib/ai/employees/social-researcher';
import {
  threadTopicPlanningSkill,
  type ThreadTopicPlanningInput,
} from '@/lib/ai/skills/thread-topic-planning';
import type { GenerateSocialDraftInput, TopicCandidate } from '@/lib/ai/social/types';

import { defineStep, runStep } from './step';

const TOPIC_PLANNING = defineStep(socialResearcherEmployee, threadTopicPlanningSkill);

export async function planWeeklyTopics(
  options: ThreadTopicPlanningInput
): Promise<TopicCandidate[]> {
  const result = await runStep(TOPIC_PLANNING, options);
  return result.candidates;
}

/**
 * 週次のテーマを見つけ、各テーマについて runOne（通常は投稿作成Workflowの実行）を並行して行う。
 * テーマ選定で見立てた感情・反応された理由と、運営が渡したThreadsの観測メモ（あれば）は、
 * 各テーマのリサーチ担当に引き継ぐ。
 */
export async function runWeeklyBatch<T>(
  options: ThreadTopicPlanningInput,
  runOne: (input: GenerateSocialDraftInput) => Promise<T>
): Promise<T[]> {
  const candidates = await planWeeklyTopics(options);

  return Promise.all(
    candidates.map((candidate) =>
      runOne({
        topic: candidate.topic,
        audience: candidate.audience,
        tone: candidate.tone,
        promoteAtlas: candidate.promoteAtlas,
        observations: options.observations,
        themeNote: `中心の感情: ${candidate.emotion} / なぜ反応されたか: ${candidate.whyItResonated}`,
      })
    )
  );
}
