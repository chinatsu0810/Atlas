import Link from 'next/link';
import { ArrowLeft, DoorOpen } from 'lucide-react';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getRecentMeetings } from '@/lib/ai/management/actions';
import { getManagementTeam } from '@/lib/office/management-team';
import { OFFICE_STATUS_LABELS } from '@/lib/office/types';

import { EmployeeAvatar } from '../employee-avatar';
import { MeetingListAndForm } from './meeting-list-and-form';

export const metadata = {
  title: 'Atlas Office | 会議室',
};

export default async function MeetingRoomPage() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">
          アクセスできません
        </h1>

        <p className="mt-3 text-sm text-gray-600">
          この会議室は運営のみ利用できます。
        </p>

        <Link
          href="/account"
          className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          マイページへ戻る
        </Link>
      </main>
    );
  }

  const [initialMeetings, management] = await Promise.all([
    getRecentMeetings(30),
    getManagementTeam(),
  ]);

  return (
    <div className="min-h-[calc(100dvh-72px)] bg-gradient-to-b from-[#EFF6FC] via-[#F7FBFD] to-white">
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
        <Link
          href="/office"
          className="mb-5 inline-flex items-center gap-2 text-sm text-[#6B8498] hover:text-[#123B5D]"
        >
          <ArrowLeft className="h-4 w-4" />
          Atlas Officeへ戻る
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123B5D] text-white">
            <DoorOpen className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#123B5D] md:text-2xl">
              会議室
              <span className="ml-2 rounded-full bg-[#EAF4FA] px-2.5 py-0.5 align-middle text-[11px] font-semibold text-[#1478B8]">
                随時
              </span>
            </h1>
            <p className="text-xs text-[#6B8498] md:text-sm">
              経営判断会議 — 案件があれば、いつでも持ち込めます
            </p>
          </div>
        </div>

        {/* 出席者 */}
        <div className="mb-6 rounded-3xl border border-[#E1EBF1] bg-white/80 p-5 shadow-sm">
          <p className="mb-4 text-xs font-semibold tracking-wide text-[#6B8498]">
            出席者
          </p>

          <div className="flex flex-wrap justify-center gap-5 md:justify-start">
            {management.employees.map((employee) => (
              <div
                key={employee.id}
                className="flex w-24 flex-col items-center text-center"
              >
                <EmployeeAvatar employee={employee} size={52} />

                <p className="mt-2 text-xs font-bold text-[#123B5D]">
                  {employee.name}
                </p>
                <p className="text-[11px] text-[#6B8498]">{employee.role}</p>

                <span className="mt-1.5 inline-block rounded-full bg-[#F1F6F5] px-2 py-0.5 text-[10px] font-medium text-[#406783]">
                  {OFFICE_STATUS_LABELS[employee.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mb-8 text-sm text-[#406783]">
          案件を投入すると、社長が論点を整理し、経営判断室（なぜなぜ上司・意思決定担当・
          反対意見担当・ユーザー視点担当・撤退判断担当・実験推進担当）が議論します。
          出た指摘は、実験推進担当が「小さく試せる実験」に変換して次の一手まで進めます。判断に必要な情報が
          不足している場合は会長へ質問し、回答を踏まえて再議論します。最後は監査室のレビューを経て、
          社長が総括したうえで、必ず「会長、どう判断しますか？」で会長へ返却します。
          AIがこの案件を最終決定することはありません。
        </p>

        <MeetingListAndForm initialMeetings={initialMeetings} />
      </main>
    </div>
  );
}
