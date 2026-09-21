// 「Threads運用チーム」のバーチャルオフィス接続部分。
//
// ここでは既存のAI社員実装（lib/ai/social）を一切変更・再実装しない。
// 既存の getLatestSocialWorkflow / SocialWorkflowStatus を読み取り専用で参照し、
// オフィス表示用の OfficeEmployeeStatus に変換するだけの「窓口」。

import { gte } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { socialWorkflows } from '@/lib/db/schema';
import { getLatestSocialWorkflow } from '@/lib/ai/social/actions';
import type { SocialWorkflow, SocialWorkflowStatus } from '@/lib/ai/social/types';

import type {
  OfficeActivityEntry,
  OfficeEmployee,
  OfficeEmployeeStatus,
  OfficeRoom,
} from './types';

// 既存の会話・確認画面（Threads運用チームの承認フロー）への接続先。
// 会話UIそのものは再実装せず、既存の /ai/social に遷移させる。
// focus クエリで、どの社員から遷移してきたかを画面側に伝える。
function conversationRouteFor(role: SocialRole): string {
  return `/ai/social?focus=${role}`;
}

// 更新が止まってから「エラー（応答なし）」とみなすまでの時間
const STALE_THRESHOLD_MS = 3 * 60 * 1000;

type SocialRole = 'researcher' | 'planner' | 'writer' | 'editor' | 'analyst';

const SOCIAL_ROLE_CONFIG: Record<
  SocialRole,
  { id: string; name: string; role: string; avatar: string }
> = {
  researcher: {
    id: 'social-researcher',
    name: 'リサ',
    role: '読者が語りたくなるテーマの発掘',
    avatar: '/office/avatars/social-researcher.png',
  },
  planner: {
    id: 'social-planner',
    name: 'キカク',
    role: '投稿の切り口・構成の企画',
    avatar: '/office/avatars/social-planner.png',
  },
  writer: {
    id: 'social-writer',
    name: 'ライタ',
    role: '投稿案の執筆',
    avatar: '/office/avatars/social-writer.png',
  },
  editor: {
    id: 'social-editor',
    name: 'ケンピン',
    role: '公開前の投稿チェック（誤字・炎上リスク）',
    avatar: '/office/avatars/social-editor.png',
  },
  analyst: {
    id: 'social-analyst',
    name: 'アナリ',
    role: '投稿の反応・数字の分析',
    avatar: '/office/avatars/social-analyst.png',
  },
};

const TEAM_NAME = 'Threads運用チーム';

function isStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > STALE_THRESHOLD_MS;
}

function baseEmployee(
  role: SocialRole,
  overrides: Partial<OfficeEmployee>
): OfficeEmployee {
  const config = SOCIAL_ROLE_CONFIG[role];

  return {
    id: config.id,
    name: config.name,
    role: config.role,
    team: TEAM_NAME,
    avatar: config.avatar,
    status: 'idle',
    statusLabel: '',
    currentTask: null,
    lastUpdated: null,
    conversationRoute: conversationRouteFor(role),
    needsAttention: false,
    notificationMessage: null,
    ...overrides,
  };
}

function statusEntry(
  status: OfficeEmployeeStatus,
  currentTask: string | null,
  extra?: Partial<OfficeEmployee>
): Partial<OfficeEmployee> {
  return { status, currentTask, ...extra };
}

/**
 * 既存の SocialWorkflowStatus（lib/ai/social/types.ts）を、
 * オフィス表示用の5名分のステータスに変換する。
 * ここでは新しいAI社員ステータスは作らず、既存の値の「見せ方」だけを決める。
 *
 * 分析担当は、KPIデータ基盤（反応の自動収集）がまだ存在しないため、
 * 自動パイプラインには組み込まれておらず、常に待機中として表示する。
 */
function deriveSocialTeamFromWorkflow(
  workflow: SocialWorkflow | null
): OfficeEmployee[] {
  const analyst = baseEmployee('analyst', {});

  if (!workflow) {
    return [
      baseEmployee('researcher', {}),
      baseEmployee('planner', {}),
      baseEmployee('writer', {}),
      baseEmployee('editor', {}),
      analyst,
    ];
  }

  const lastUpdated = workflow.updatedAt;
  const stale = isStale(lastUpdated);
  const topicLabel = `「${workflow.topic}」`;

  let researcher: Partial<OfficeEmployee> = statusEntry('idle', null);
  let planner: Partial<OfficeEmployee> = statusEntry('idle', null);
  let writer: Partial<OfficeEmployee> = statusEntry('idle', null);
  let editor: Partial<OfficeEmployee> = statusEntry('idle', null);

  switch (workflow.status) {
    case 'researching':
      researcher = statusEntry(
        stale ? 'error' : 'researching',
        `${topicLabel}の投稿ネタを調査しています`
      );
      break;

    case 'planning':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry(
        stale ? 'error' : 'working',
        `${topicLabel}の切り口・構成を検討しています`
      );
      break;

    case 'writing':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry('done', `${topicLabel}の企画完了`);
      writer = statusEntry(
        stale ? 'error' : 'writing',
        `${topicLabel}の投稿案を作成しています`
      );
      break;

    case 'auditing':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry('done', `${topicLabel}の企画完了`);
      writer = statusEntry('done', `${topicLabel}の投稿案を提出しました`);
      editor = statusEntry(
        stale ? 'error' : 'reviewing',
        `${topicLabel}の投稿案を確認しています`
      );
      break;

    case 'needs_revision':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry('done', `${topicLabel}の企画完了`);
      writer = statusEntry('idle', '検品からの差し戻し待ちです');
      editor = statusEntry(
        'awaiting_owner',
        `${topicLabel}の投稿案に修正点を見つけました`,
        {
          needsAttention: true,
          notificationMessage:
            '投稿案に修正点が見つかりました。内容を確認し、必要であれば「修正して再監査」を実行してください。',
        }
      );
      break;

    case 'pending_review':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry('done', `${topicLabel}の企画完了`);
      writer = statusEntry(
        'awaiting_owner',
        `${topicLabel}の投稿案ができました`,
        {
          needsAttention: true,
          notificationMessage:
            '投稿案ができました。内容を確認のうえ、承認または却下をお願いします。',
        }
      );
      editor = statusEntry('done', `${topicLabel}の検品OK`);
      break;

    case 'approved':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry('done', `${topicLabel}の企画完了`);
      writer = statusEntry('done', `${topicLabel}は承認済み（投稿待ち）`);
      editor = statusEntry('done', `${topicLabel}の検品OK`);
      break;

    case 'rejected':
      researcher = statusEntry('idle', null);
      planner = statusEntry('idle', null);
      writer = statusEntry('done', `${topicLabel}は却下されました`);
      editor = statusEntry('done', `${topicLabel}の検品OK`);
      break;

    case 'posted':
      researcher = statusEntry('done', `${topicLabel}のリサーチ完了`);
      planner = statusEntry('done', `${topicLabel}の企画完了`);
      writer = statusEntry('done', `${topicLabel}は投稿済みです`);
      editor = statusEntry('done', `${topicLabel}の検品OK`);
      break;
  }

  return [
    baseEmployee('researcher', { ...researcher, lastUpdated }),
    baseEmployee('planner', { ...planner, lastUpdated }),
    baseEmployee('writer', { ...writer, lastUpdated }),
    baseEmployee('editor', { ...editor, lastUpdated }),
    analyst,
  ];
}

export async function getSocialTeamEmployees(): Promise<OfficeEmployee[]> {
  const latest = await getLatestSocialWorkflow();
  return deriveSocialTeamFromWorkflow(latest);
}

// 今週（月曜0時〜）の開始時刻
function startOfThisWeek(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);

  return start;
}

/**
 * Threadsチームは「週次」で動く。今週分の投稿案の状況を部屋の状況として出す。
 * 今週分がまだ作られていなければ、作成を促す案内にする。
 */
export async function getSocialTeamRoom(): Promise<OfficeRoom> {
  const rows = await db
    .select({ status: socialWorkflows.status })
    .from(socialWorkflows)
    .where(gte(socialWorkflows.createdAt, startOfThisWeek()));

  const total = rows.length;
  const pendingReview = rows.filter((row) => row.status === 'pending_review').length;
  const needsRevision = rows.filter((row) => row.status === 'needs_revision').length;
  const needsAttention = pendingReview + needsRevision;

  const summary =
    total === 0
      ? '今週分の投稿案はまだ作成されていません。'
      : `今週の投稿案 ${total}件` +
        (needsAttention > 0
          ? `（確認待ち ${pendingReview}件・要修正 ${needsRevision}件）`
          : '（対応が必要なものはありません）');

  return {
    id: 'threads-room',
    name: 'Threads運用室',
    teamName: TEAM_NAME,
    cadenceLabel: '週次',
    summary,
    needsAttention: needsAttention > 0,
    enterRoute: '/ai/social',
    enterLabel: total === 0 ? '今週分を作成する' : '投稿案を確認する',
  };
}

function roleName(role: SocialRole): string {
  return SOCIAL_ROLE_CONFIG[role].name;
}

function roleTitle(role: SocialRole): string {
  return SOCIAL_ROLE_CONFIG[role].role;
}

/**
 * 本日分の social_workflows から、TODAY'S WORK 用の時系列エントリを組み立てる。
 * social_workflows は現在のステータスのみを保持し、フェーズごとの履歴は
 * 保存されていないため、既存データにある createdAt / updatedAt / approvedAt /
 * postedAt から「表示用に」再構成する（新しい履歴テーブルは追加しない）。
 */
export async function getSocialTeamActivityToday(): Promise<
  OfficeActivityEntry[]
> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(socialWorkflows)
    .where(gte(socialWorkflows.createdAt, startOfToday))
    .orderBy(socialWorkflows.createdAt);

  const entries: OfficeActivityEntry[] = [];

  for (const row of rows) {
    const topicLabel = `「${row.topic}」`;

    entries.push({
      id: `${row.id}-created`,
      time: row.createdAt,
      employeeName: roleName('researcher'),
      employeeRole: roleTitle('researcher'),
      message: `${topicLabel}のリサーチを開始しました`,
    });

    const status = row.status as SocialWorkflowStatus;

    if (status === 'needs_revision' || status === 'pending_review') {
      entries.push({
        id: `${row.id}-audited`,
        time: row.updatedAt,
        employeeName: roleName('editor'),
        employeeRole: roleTitle('editor'),
        message:
          status === 'pending_review'
            ? `${topicLabel}の検品OK → オーナー確認待ち`
            : `${topicLabel}の検品で修正点を発見 → ライターへ差し戻し`,
      });

      if (status === 'pending_review') {
        entries.push({
          id: `${row.id}-notify`,
          time: row.updatedAt,
          employeeName: roleName('writer'),
          employeeRole: roleTitle('writer'),
          message: `${topicLabel}の投稿案について確認依頼があります`,
          isNotification: true,
        });
      }
    } else if (
      status === 'approved' ||
      status === 'rejected' ||
      status === 'posted'
    ) {
      entries.push({
        id: `${row.id}-audited`,
        time: row.updatedAt,
        employeeName: roleName('editor'),
        employeeRole: roleTitle('editor'),
        message: `${topicLabel}の検品OK → オーナー確認待ち`,
      });
    }

    if (row.approvedAt) {
      entries.push({
        id: `${row.id}-approved`,
        time: row.approvedAt,
        employeeName: 'オーナー',
        employeeRole: '承認',
        message: `${topicLabel}を承認しました`,
      });
    }

    if (row.status === 'rejected') {
      entries.push({
        id: `${row.id}-rejected`,
        time: row.updatedAt,
        employeeName: 'オーナー',
        employeeRole: '却下',
        message: `${topicLabel}を却下しました`,
      });
    }

    if (row.postedAt) {
      entries.push({
        id: `${row.id}-posted`,
        time: row.postedAt,
        employeeName: 'オーナー',
        employeeRole: '投稿済み',
        message: `${topicLabel}をThreadsへ投稿済みにしました`,
      });
    }
  }

  return entries.sort((a, b) => a.time.getTime() - b.time.getTime());
}
