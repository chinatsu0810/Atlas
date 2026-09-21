'use server';

import { getUser } from '@/lib/db/queries';
import type { ActionResult } from '@/lib/action-result';
import { isAdmin } from '@/lib/auth/permissions';

import { SkillCallError } from '@/lib/ai/core/skill';
import { runKpiReview } from '@/lib/ai/workflows/kpi-review';

import { ThreadsApiError } from './client';
import { getThreadsConfig } from './config';
import { deleteConnection, getAccessToken, getConnectionRow } from './connection';
import { ThreadsNoDataError, ThreadsNotConnectedError } from './errors';
import { buildWeeklyKpiInput } from './insights';
import { getLatestKpiReport, saveKpiReport, toKpiReportView, type KpiReportView } from './reports';

// このファイルの役割は、権限チェックと、Threads連携（lib/threads）・KPIレビューWorkflowの呼び出しだけ。
// 画面から呼ばれる処理は、エラーを例外ではなく結果として返す
// （本番ではServer Actionの例外メッセージが画面に届かないため）。

export type ThreadsStatus = {
  configured: boolean;
  // Metaのアプリ設定に登録すべきリダイレクトURI（未設定なら null）と、それがHTTPSか
  redirectUri: string | null;
  redirectUriIsSecure: boolean;
  // 認可に使う Threads App ID（公開情報。Metaの画面の値と照合できるよう、運営にだけ表示する）
  appId: string | null;
  appIdLooksValid: boolean;
  connected: boolean;
  username: string | null;
  // トークンの有効期限（ISO文字列）
  expiresAt: string | null;
  expired: boolean;
};

// 分析の結果。保存できた場合は id が入る（保存に失敗しても、結果自体は表示する）
export type WeeklyKpiReview = KpiReportView;

async function getOwnerId(): Promise<number | null> {
  const user = await getUser();
  return user && (await isAdmin(user.id)) ? user.id : null;
}

async function isOwner(): Promise<boolean> {
  return (await getOwnerId()) !== null;
}

export async function getThreadsStatus(): Promise<ThreadsStatus> {
  const config = getThreadsConfig();

  const base = {
    configured: config !== null,
    redirectUri: config?.redirectUri ?? null,
    redirectUriIsSecure: config?.redirectUriIsSecure ?? false,
    appId: config?.appId ?? null,
    appIdLooksValid: config?.appIdLooksValid ?? false,
    connected: false,
    username: null,
    expiresAt: null,
    expired: false,
  };

  // 運営以外には、設定内容（リダイレクトURI）を返さない
  if (!(await isOwner())) {
    return { ...base, redirectUri: null, appId: null };
  }

  const row = await getConnectionRow();

  if (!row) return base;

  return {
    ...base,
    connected: true,
    username: row.username,
    expiresAt: row.tokenExpiresAt.toISOString(),
    expired: row.tokenExpiresAt <= new Date(),
  };
}

export async function disconnectThreads(): Promise<ActionResult<null>> {
  if (!(await isOwner())) {
    return { ok: false, error: 'この操作は運営のみ実行できます。' };
  }

  await deleteConnection();

  return { ok: true, data: null };
}

/**
 * 直近7日間の自分のThreadsの数字を取得し、分析担当が分析する（KPIレビューWorkflow）。
 * 分析担当は改善の材料を整理するだけで、決定はしない。
 */
export async function runWeeklyKpiReview(): Promise<ActionResult<WeeklyKpiReview>> {
  const ownerId = await getOwnerId();

  if (ownerId === null) {
    return { ok: false, error: 'この操作は運営のみ実行できます。' };
  }

  if (!getThreadsConfig()) {
    return {
      ok: false,
      error: 'Threads連携が設定されていません（THREADS_APP_ID / THREADS_APP_SECRET）。',
    };
  }

  try {
    const { token, threadsUserId } = await getAccessToken();

    // 前回の分析が保存されていれば、前回からの変化も分析に含める（読み込みに失敗しても、分析は続ける）
    const previous = await getLatestKpiReport().catch((error) => {
      console.error('Failed to load the previous KPI report:', error);
      return null;
    });

    const { input, snapshot, periodStart, periodEnd } = await buildWeeklyKpiInput(
      token,
      threadsUserId,
      { previous }
    );
    const review = await runKpiReview(input);

    const context = input.context ?? '';

    // 保存に失敗しても、（AIの呼び出しが済んだ）分析の結果は捨てずに表示する
    try {
      const saved = await saveKpiReport({
        createdBy: ownerId,
        periodStart,
        periodEnd,
        metrics: input.metrics,
        context,
        snapshot,
        review,
      });

      return { ok: true, data: toKpiReportView(saved) };
    } catch (error) {
      console.error('Failed to save the KPI report:', error);

      return {
        ok: true,
        data: {
          id: null,
          createdAt: new Date().toISOString(),
          period: input.period,
          metrics: input.metrics,
          context,
          review,
        },
      };
    }
  } catch (error) {
    if (error instanceof ThreadsNotConnectedError || error instanceof ThreadsNoDataError) {
      return { ok: false, error: error.message };
    }

    if (error instanceof ThreadsApiError) {
      return {
        ok: false,
        error: error.isInvalidToken
          ? 'Threadsのアクセストークンが無効です。連携をやり直してください。'
          : `Threads APIがエラーを返しました: ${error.message}`,
      };
    }

    if (error instanceof SkillCallError) {
      return { ok: false, error: error.message };
    }

    console.error('Unexpected error running weekly KPI review:', error);

    return {
      ok: false,
      error: '予期しないエラーが発生しました。しばらくしてからもう一度お試しください。',
    };
  }
}
