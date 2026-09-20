// バーチャルオフィス側の型定義。
// ここはAI社員の「外側」の表示用データのみを扱い、AI社員自身のロジック・
// ステータス仕様（例: lib/ai/social の SocialWorkflowStatus）は変更しない。

// オフィス表示用に変換した後の状態（待機中/作業中/調査中/執筆中/確認中/私の確認待ち/完了/エラー）
export type OfficeEmployeeStatus =
  | 'idle'
  | 'working'
  | 'researching'
  | 'writing'
  | 'reviewing'
  | 'awaiting_owner'
  | 'done'
  | 'error';

export const OFFICE_STATUS_LABELS: Record<OfficeEmployeeStatus, string> = {
  idle: '待機中',
  working: '作業中',
  researching: '調査中',
  writing: '執筆中',
  reviewing: '確認中',
  awaiting_owner: '私の確認待ち',
  done: '完了',
  error: 'エラー',
};

export type OfficeEmployee = {
  id: string;
  name: string;
  role: string;
  team: string;
  avatar: string;
  status: OfficeEmployeeStatus;
  statusLabel: string;
  currentTask: string | null;
  lastUpdated: Date | null;
  conversationRoute: string;
  needsAttention: boolean;
  notificationMessage: string | null;
};

export type OfficeActivityEntry = {
  id: string;
  time: Date;
  employeeName: string;
  employeeRole: string;
  message: string;
  isNotification?: boolean;
};

// オフィスフロア上の「部屋」。チーム（OfficeEmployee.team）ごとに1部屋あり、
// 稼働のリズム（随時／週次）や現在の状況、入室先をまとめて表示するためのもの。
export type OfficeRoom = {
  id: string;
  name: string;
  // この部屋に属する社員の OfficeEmployee.team と一致させる
  teamName: string;
  // 稼働のリズムのラベル（例: 随時 / 週次）
  cadenceLabel: string;
  // 部屋の現在の状況（1〜2行）
  summary: string;
  needsAttention: boolean;
  enterRoute: string;
  enterLabel: string;
};

export type OfficeState = {
  employees: OfficeEmployee[];
  rooms: OfficeRoom[];
  activity: OfficeActivityEntry[];
  generatedAt: string;
};
