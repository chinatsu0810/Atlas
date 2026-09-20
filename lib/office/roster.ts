// バーチャルオフィス全体の社員名簿を組み立てる集約レイヤー。
//
// 新しいAI社員（チーム）を追加したいときは、その社員専用の
// `getXxxEmployees()` / `getXxxActivityToday()` を lib/office/ 配下に追加し、
// ここで呼び出す配列に加えるだけでよい。オフィス側のUI（app/office）は
// この関数が返すデータだけを見て描画するため、UI側の変更は不要。

import {
  OFFICE_STATUS_LABELS,
  type OfficeActivityEntry,
  type OfficeEmployee,
  type OfficeRoom,
  type OfficeState,
} from './types';
import {
  getSocialTeamActivityToday,
  getSocialTeamEmployees,
  getSocialTeamRoom,
} from './social-team';
import {
  getManagementTeam,
  getManagementTeamActivityToday,
} from './management-team';

function withStatusLabel(employee: OfficeEmployee): OfficeEmployee {
  return {
    ...employee,
    statusLabel: OFFICE_STATUS_LABELS[employee.status],
  };
}

// フロアに並べる順番は「随時」の会議室が先、「週次」のチームが後
export async function getOfficeFloor(): Promise<{
  employees: OfficeEmployee[];
  rooms: OfficeRoom[];
}> {
  // 今後チームが増えた場合はここにチームを追加していく
  const [management, socialEmployees, socialRoom] = await Promise.all([
    getManagementTeam(),
    getSocialTeamEmployees(),
    getSocialTeamRoom(),
  ]);

  return {
    employees: [...management.employees, ...socialEmployees].map(withStatusLabel),
    rooms: [management.room, socialRoom],
  };
}

export async function getOfficeActivityToday(): Promise<OfficeActivityEntry[]> {
  const [managementActivity, socialActivity] = await Promise.all([
    getManagementTeamActivityToday(),
    getSocialTeamActivityToday(),
  ]);

  return [...managementActivity, ...socialActivity].sort(
    (a, b) => a.time.getTime() - b.time.getTime()
  );
}

export async function getOfficeState(): Promise<OfficeState> {
  const [floor, activity] = await Promise.all([
    getOfficeFloor(),
    getOfficeActivityToday(),
  ]);

  return {
    employees: floor.employees,
    rooms: floor.rooms,
    activity,
    generatedAt: new Date().toISOString(),
  };
}
