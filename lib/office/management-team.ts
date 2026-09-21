// 「経営判断室」のバーチャルオフィス接続部分（社長・経営判断室6名・シンサ）。
//
// lib/office/social-team.ts と同じ考え方で、既存のAI社員実装（lib/ai/management）を
// 一切変更・再実装しない。直近の会議（getLatestMeeting）を読み取り専用で参照し、
// オフィス表示用の OfficeEmployeeStatus に変換するだけの「窓口」。

import { getLatestMeeting } from '@/lib/ai/management/actions';
import type { Meeting, MeetingStage } from '@/lib/ai/management/types';

import type {
  OfficeActivityEntry,
  OfficeEmployee,
  OfficeEmployeeStatus,
  OfficeRoom,
} from './types';

type ManagementRole =
  | 'president'
  | 'why-analyst'
  | 'decision-maker'
  | 'contrarian'
  | 'user-advocate'
  | 'exit-planner'
  | 'experiment-driver'
  | 'management-auditor';

const ROLE_CONFIG: Record<
  ManagementRole,
  { id: string; name: string; role: string; avatar: string }
> = {
  president: {
    id: 'president',
    name: '社長',
    role: '会議進行・論点整理・総括',
    avatar: '/office/avatars/president.png',
  },
  'why-analyst': {
    id: 'why-analyst',
    name: 'ナゼ',
    role: '原因の深掘り（なぜなぜ分析）',
    avatar: '/office/avatars/why-analyst.png',
  },
  'decision-maker': {
    id: 'decision-maker',
    name: 'ヒカク',
    role: '選択肢の比較・一次案のとりまとめ',
    avatar: '/office/avatars/decision-maker.png',
  },
  contrarian: {
    id: 'contrarian',
    name: 'ギモン',
    role: '前提を疑う・リスク指摘',
    avatar: '/office/avatars/contrarian.png',
  },
  'user-advocate': {
    id: 'user-advocate',
    name: 'リヨウシャ',
    role: '利用者から見た価値と懸念の確認',
    avatar: '/office/avatars/user-advocate.png',
  },
  'exit-planner': {
    id: 'exit-planner',
    name: 'テッタイ',
    role: '成功条件・撤退基準の設定',
    avatar: '/office/avatars/exit-planner.png',
  },
  'experiment-driver': {
    id: 'experiment-driver',
    name: 'スイシン',
    role: '指摘を小さな実験に落とし込む',
    avatar: '/office/avatars/experiment-driver.png',
  },
  'management-auditor': {
    id: 'management-auditor',
    name: 'シンサ',
    role: '一次案の監査・差し戻し',
    avatar: '/office/avatars/management-auditor.png',
  },
};

const COMMITTEE_ROLES: ManagementRole[] = [
  'why-analyst',
  'decision-maker',
  'contrarian',
  'user-advocate',
  'exit-planner',
  'experiment-driver',
];

const TEAM_NAME = '経営判断室';

// 会議室（案件の持ち込み・会議一覧）
const MEETING_ROOM_ROUTE = '/office/meeting';

function conversationRouteFor(meeting: Meeting | null): string {
  return meeting && meeting.stage !== 'closed'
    ? `${MEETING_ROOM_ROUTE}/${meeting.id}`
    : MEETING_ROOM_ROUTE;
}

function baseEmployee(
  role: ManagementRole,
  meeting: Meeting | null,
  overrides: Partial<OfficeEmployee>
): OfficeEmployee {
  const config = ROLE_CONFIG[role];

  return {
    id: config.id,
    name: config.name,
    role: config.role,
    team: TEAM_NAME,
    avatar: config.avatar,
    status: 'idle',
    statusLabel: '',
    currentTask: null,
    lastUpdated: meeting?.updatedAt ?? null,
    conversationRoute: conversationRouteFor(meeting),
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
 * 既存の MeetingStage（lib/ai/management/types.ts）を、
 * オフィス表示用の8名分のステータスに変換する。
 * 経営判断室6名は個別に発言順を追わず、議論フェーズかどうかだけをまとめて表示する
 * （個別の発言内容は /office/meeting/[id] で確認する）。
 */
function deriveManagementTeamFromMeeting(meeting: Meeting | null): OfficeEmployee[] {
  if (!meeting || meeting.stage === 'closed') {
    return [
      baseEmployee('president', meeting, {}),
      ...COMMITTEE_ROLES.map((role) => baseEmployee(role, meeting, {})),
      baseEmployee('management-auditor', meeting, {}),
    ];
  }

  const topicLabel = `「${meeting.topic}」`;

  let president: Partial<OfficeEmployee> = statusEntry('idle', null);
  let committee: Partial<OfficeEmployee> = statusEntry('idle', null);
  let auditor: Partial<OfficeEmployee> = statusEntry('idle', null);

  const stage: MeetingStage = meeting.stage;

  switch (stage) {
    case 'framing':
      president = statusEntry('working', `${topicLabel}の案件を整理しています`);
      break;

    case 'discussing':
      president = statusEntry('done', `${topicLabel}の案件整理が完了`);
      committee = statusEntry('working', `${topicLabel}について議論しています`);
      break;

    case 'awaiting_owner_input':
      president = statusEntry(
        'awaiting_owner',
        `${topicLabel}について会長への質問があります`,
        {
          needsAttention: true,
          notificationMessage:
            '経営判断室から会長への質問があります。内容を確認し、回答してください。',
        }
      );
      committee = statusEntry('done', `${topicLabel}の議論が一区切りしました`);
      break;

    case 'drafting_proposal':
    case 'needs_rework':
      president = statusEntry('done', `${topicLabel}の案件整理が完了`);
      committee = statusEntry('working', `${topicLabel}の一次案を作成しています`);
      break;

    case 'auditing_proposal':
      president = statusEntry('done', `${topicLabel}の案件整理が完了`);
      committee = statusEntry('done', `${topicLabel}の一次案を提出しました`);
      auditor = statusEntry('reviewing', `${topicLabel}の一次案をレビューしています`);
      break;

    case 'summarizing':
      president = statusEntry('working', `${topicLabel}の総括をまとめています`);
      committee = statusEntry('done', `${topicLabel}の一次案が完了`);
      auditor = statusEntry('done', `${topicLabel}のレビューOK`);
      break;

    case 'awaiting_owner_decision':
      president = statusEntry(
        'awaiting_owner',
        `${topicLabel}の総括が完成し、会長の判断待ちです`,
        {
          needsAttention: true,
          notificationMessage:
            '会議の総括ができました。「会長、どう判断しますか？」への回答をお願いします。',
        }
      );
      committee = statusEntry('done', `${topicLabel}の一次案が完了`);
      auditor = statusEntry('done', `${topicLabel}のレビューOK`);
      break;
  }

  return [
    baseEmployee('president', meeting, president),
    ...COMMITTEE_ROLES.map((role) => baseEmployee(role, meeting, committee)),
    baseEmployee('management-auditor', meeting, auditor),
  ];
}

const MEETING_STAGE_SUMMARIES: Record<MeetingStage, string> = {
  framing: '社長が案件を整理しています',
  discussing: '経営判断室が議論しています',
  awaiting_owner_input: '会長への質問があります。回答をお待ちしています',
  drafting_proposal: '経営判断室が一次案を作成しています',
  needs_rework: '監査室の指摘を受けて一次案を作り直しています',
  auditing_proposal: '監査室が一次案をレビューしています',
  summarizing: '社長が総括をまとめています',
  awaiting_owner_decision: '総括ができました。会長の判断をお待ちしています',
  closed: '会長の判断が記録されました',
};

/**
 * 経営判断会議は「随時」開かれるため、直近の会議の状況をそのまま部屋の状況として出す。
 * 開催中の会議がなければ、案件を持ち込めることを案内する。
 */
function deriveMeetingRoom(meeting: Meeting | null): OfficeRoom {
  const isActive = meeting !== null && meeting.stage !== 'closed';

  const summary = isActive
    ? `「${meeting.topic}」— ${MEETING_STAGE_SUMMARIES[meeting.stage]}`
    : '開催中の会議はありません。案件があれば、いつでも持ち込めます。';

  return {
    id: 'meeting-room',
    name: '会議室（経営判断会議）',
    teamName: TEAM_NAME,
    cadenceLabel: '随時',
    summary,
    needsAttention:
      isActive &&
      (meeting.stage === 'awaiting_owner_input' ||
        meeting.stage === 'awaiting_owner_decision'),
    enterRoute: isActive ? `${MEETING_ROOM_ROUTE}/${meeting.id}` : MEETING_ROOM_ROUTE,
    enterLabel: isActive ? '会議に参加する' : '会議室に入る',
    // 開催中の会議があっても、クローズを待たずに次の案件を持ち込めるようにする
    ...(isActive
      ? { secondaryRoute: MEETING_ROOM_ROUTE, secondaryLabel: '新しい会議を開く' }
      : {}),
  };
}

// 直近の会議を1回だけ取得し、社員の表示と部屋の表示の両方に使う
export async function getManagementTeam(): Promise<{
  employees: OfficeEmployee[];
  room: OfficeRoom;
}> {
  const latest = await getLatestMeeting();

  return {
    employees: deriveManagementTeamFromMeeting(latest),
    room: deriveMeetingRoom(latest),
  };
}

/**
 * 会議の発言は /office/meeting/[id] で時系列に確認できるため、
 * TODAY'S WORK 欄への重複表示はまだ行わない（将来の拡張候補）。
 */
export async function getManagementTeamActivityToday(): Promise<OfficeActivityEntry[]> {
  return [];
}
