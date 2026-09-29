// 「ガイド編集部」（国・地域別まとめ）のバーチャルオフィス接続部分。
//
// AI社員の実装（lib/ai/guides）は変更しない。まとめの状態を読み取り専用で参照し、
// オフィス表示用の OfficeEmployee / OfficeRoom に変換するだけの「窓口」。

import { and, gte, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { placeGuides } from '@/lib/db/schema';
import { listPlaceGuides, type PlaceGuide } from '@/lib/ai/guides/queries';
import type { GuideStatus } from '@/lib/ai/guides/types';
import { guideTargetLabel } from '@/lib/places/labels';

import type { OfficeActivityEntry, OfficeEmployee, OfficeEmployeeStatus, OfficeRoom } from './types';

const TEAM_NAME = 'ガイド編集部';

type GuideRole = 'chief' | 'researcher' | 'factChecker' | 'writer' | 'reviewer';

const ROLE_CONFIG: Record<GuideRole, { id: string; name: string; role: string }> = {
  chief: { id: 'guide-chief', name: 'ヘンシュウ', role: 'まとめの企画（見出しと調べることを決める）' },
  researcher: { id: 'guide-researcher', name: 'シラベ', role: 'まとめの調査（一次情報を探して出典を付ける）' },
  factChecker: { id: 'guide-fact-checker', name: 'タシカ', role: 'まとめの正誤チェック（出典と照らし合わせる）' },
  writer: { id: 'guide-writer', name: 'マトメ', role: 'まとめの執筆（確認済みの情報だけで書く）' },
  reviewer: { id: 'guide-reviewer', name: 'チュウリツ', role: 'まとめの審査（中立さ・出典・表現の確認）' },
};

const ROLES_IN_ORDER: GuideRole[] = ['chief', 'researcher', 'factChecker', 'writer', 'reviewer'];

// 自動で進む段階と、その担当・作業中の表示
const STEP_OWNER: Partial<Record<GuideStatus, { role: GuideRole; status: OfficeEmployeeStatus; task: string }>> = {
  planning: { role: 'chief', status: 'working', task: 'の見出しを考えています' },
  researching: { role: 'researcher', status: 'researching', task: 'の情報をWebで調べています' },
  checking: { role: 'factChecker', status: 'reviewing', task: 'の出典を確かめています' },
  writing: { role: 'writer', status: 'writing', task: 'のまとめを書いています' },
  reviewing: { role: 'reviewer', status: 'reviewing', task: 'のまとめを審査しています' },
};

function employee(role: GuideRole, route: string, overrides: Partial<OfficeEmployee> = {}): OfficeEmployee {
  const config = ROLE_CONFIG[role];
  return {
    id: config.id,
    name: config.name,
    role: config.role,
    team: TEAM_NAME,
    // 画像が無いときは、名前の頭文字で表示される
    avatar: `/office/avatars/${config.id}.png`,
    status: 'idle',
    statusLabel: '',
    currentTask: null,
    lastUpdated: null,
    conversationRoute: route,
    needsAttention: false,
    notificationMessage: null,
    ...overrides,
  };
}

function deriveEmployees(latest: PlaceGuide | null): OfficeEmployee[] {
  if (!latest) return ROLES_IN_ORDER.map((role) => employee(role, '/ai/guides'));

  const route = `/ai/guides/${latest.id}`;
  const label = `「${guideTargetLabel(latest.countrySlug, latest.regionSlug, latest.themeKey)}」`;
  const lastUpdated = latest.updatedAt;
  const owner = STEP_OWNER[latest.status];
  // 企画の確認待ちのときは、企画（編集長）より後の担当はまだ動いていない
  const ownerIndex = owner
    ? ROLES_IN_ORDER.indexOf(owner.role)
    : latest.status === 'plan_review'
      ? 1
      : ROLES_IN_ORDER.length;

  return ROLES_IN_ORDER.map((role, index) => {
    if (latest.status === 'plan_review' && role === 'chief') {
      return employee(role, route, {
        status: 'awaiting_owner',
        currentTask: `${label}の企画ができました`,
        lastUpdated,
        needsAttention: true,
        notificationMessage: '企画ができました。比べる項目や見出しを確認・手直しして、調査を始めてください。',
      });
    }

    if (latest.status === 'pending_review' && role === 'chief') {
      return employee(role, route, {
        status: 'awaiting_owner',
        currentTask: `${label}のまとめができました`,
        lastUpdated,
        needsAttention: true,
        notificationMessage: 'まとめができました。内容を確認し、手直し・公開・差し戻しをしてください。',
      });
    }

    if (owner && role === owner.role) {
      if (latest.error) {
        return employee(role, route, {
          status: 'error',
          currentTask: `${label}で止まっています`,
          lastUpdated,
          needsAttention: true,
          notificationMessage: `止まりました：${latest.error}`,
        });
      }
      // 段階は、運営画面を開いている間だけ進む。開いていなければ続きを待っている
      return employee(role, route, {
        status: latest.running ? owner.status : 'idle',
        currentTask: latest.running ? `${label}${owner.task}` : `${label}の続きは、画面を開くと進みます`,
        lastUpdated,
      });
    }

    if (index < ownerIndex) {
      return employee(role, route, { status: 'done', currentTask: `${label}の担当分が完了`, lastUpdated });
    }

    return employee(role, route);
  });
}

async function listGuidesSafely(): Promise<PlaceGuide[]> {
  // テーブルが無い環境（マイグレーション前）でも、オフィス全体は表示する
  return listPlaceGuides().catch((error) => {
    console.error('Failed to load place guides for office:', error);
    return [];
  });
}

export async function getGuideTeam(): Promise<{ employees: OfficeEmployee[]; room: OfficeRoom }> {
  const guides = await listGuidesSafely();
  const pendingReview = guides.filter(
    (guide) => guide.status === 'pending_review' || guide.status === 'plan_review'
  ).length;
  const stopped = guides.filter((guide) => guide.error).length;
  const published = guides.filter((guide) => guide.status === 'published').length;

  const summary =
    guides.length === 0
      ? 'まだまとめはありません。国・地域・テーマを選んで作れます。'
      : `公開中 ${published}件` +
        (pendingReview > 0 ? `・確認待ち ${pendingReview}件` : '') +
        (stopped > 0 ? `・止まっているもの ${stopped}件` : '');

  return {
    employees: deriveEmployees(guides[0] ?? null),
    room: {
      id: 'guide-room',
      name: '国・地域別まとめ室',
      teamName: TEAM_NAME,
      cadenceLabel: '随時',
      summary,
      needsAttention: pendingReview + stopped > 0,
      enterRoute: '/ai/guides',
      enterLabel: pendingReview > 0 ? 'まとめを確認する' : 'まとめを作る',
    },
  };
}

// 今日作り始めた・公開したまとめを、TODAY'S WORK 用に並べる
export async function getGuideTeamActivityToday(): Promise<OfficeActivityEntry[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(placeGuides)
    .where(and(isNull(placeGuides.deletedAt), gte(placeGuides.updatedAt, startOfToday)))
    .catch((error) => {
      console.error('Failed to load place guide activity:', error);
      return [];
    });

  const entries: OfficeActivityEntry[] = [];

  for (const row of rows) {
    const label = `「${guideTargetLabel(row.countrySlug, row.regionSlug, row.themeKey)}」`;

    if (row.createdAt >= startOfToday) {
      entries.push({
        id: `guide-${row.id}-created`,
        time: row.createdAt,
        employeeName: ROLE_CONFIG.chief.name,
        employeeRole: ROLE_CONFIG.chief.role,
        message: `${label}のまとめの企画を始めました`,
      });
    }

    if (row.status === 'pending_review') {
      entries.push({
        id: `guide-${row.id}-ready`,
        time: row.updatedAt,
        employeeName: ROLE_CONFIG.reviewer.name,
        employeeRole: ROLE_CONFIG.reviewer.role,
        message: `${label}のまとめの審査が終わりました。会長の確認待ちです`,
        isNotification: true,
      });
    }

    if (row.publishedAt && row.publishedAt >= startOfToday) {
      entries.push({
        id: `guide-${row.id}-published`,
        time: row.publishedAt,
        employeeName: ROLE_CONFIG.chief.name,
        employeeRole: ROLE_CONFIG.chief.role,
        message: `${label}のまとめが公開されました`,
      });
    }
  }

  return entries;
}
