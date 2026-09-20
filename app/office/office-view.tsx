'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, Building2, Clock, DoorOpen } from 'lucide-react';

import type { OfficeEmployee, OfficeRoom, OfficeState } from '@/lib/office/types';
import { EmployeeAvatar } from './employee-avatar';

const POLL_INTERVAL_MS = 5000;

function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByTeam(employees: OfficeState['employees']) {
  const teams = new Map<string, OfficeState['employees']>();

  for (const employee of employees) {
    const current = teams.get(employee.team) ?? [];
    current.push(employee);
    teams.set(employee.team, current);
  }

  return Array.from(teams.entries());
}

function MemberList({ members }: { members: OfficeEmployee[] }) {
  return (
    <div className="relative flex flex-wrap justify-center gap-8 md:justify-start md:gap-10">
      {members.map((employee) => (
        <Link
          key={employee.id}
          href={employee.conversationRoute}
          className="group flex w-32 flex-col items-center text-center"
        >
          <EmployeeAvatar employee={employee} />

          <p className="mt-3 text-sm font-bold text-[#123B5D]">
            {employee.name}
          </p>
          <p className="text-xs text-[#6B8498]">{employee.role}</p>

          <span className="mt-2 inline-block rounded-full bg-[#F1F6F5] px-2.5 py-1 text-[11px] font-medium text-[#406783]">
            {employee.statusLabel}
          </span>

          {employee.currentTask && (
            <p className="mt-2 line-clamp-2 rounded-xl bg-gray-50 px-2.5 py-1.5 text-[11px] leading-snug text-gray-600 group-hover:bg-gray-100">
              {employee.currentTask}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

function RoomPanel({
  room,
  members,
}: {
  room: OfficeRoom;
  members: OfficeEmployee[];
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-white/80 p-6 shadow-sm backdrop-blur ${
        room.needsAttention ? 'border-orange-200' : 'border-[#E1EBF1]'
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 bottom-4 top-24 -z-0 rounded-2xl bg-gradient-to-b from-[#F3F9FC] to-transparent"
      />

      <div className="relative mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#123B5D]">{room.name}</p>

            <span className="rounded-full bg-[#EAF4FA] px-2.5 py-0.5 text-[11px] font-semibold text-[#1478B8]">
              {room.cadenceLabel}
            </span>
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-[#6B8498] md:text-sm">
            {room.summary}
          </p>
        </div>

        <Link
          href={room.enterRoute}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition md:text-sm ${
            room.needsAttention
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'border border-[#DCEAF2] bg-white text-[#406783] hover:bg-[#F3F9FC]'
          }`}
        >
          <DoorOpen className="h-4 w-4" />
          {room.enterLabel}
        </Link>
      </div>

      <MemberList members={members} />
    </div>
  );
}

export function OfficeView({ initialState }: { initialState: OfficeState }) {
  const [state, setState] = useState<OfficeState>(initialState);
  // サーバーとクライアントで new Date() の値がずれてハイドレーションエラーに
  // なるのを避けるため、初期値は null にしてマウント後にのみ時刻を入れる
  const [now, setNow] = useState<Date | null>(null);
  const isFetching = useRef(false);

  useEffect(() => {
    setNow(new Date());
    const clockTimer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const poll = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const response = await fetch('/api/office/state', {
          cache: 'no-store',
        });

        if (response.ok) {
          const data: OfficeState = await response.json();
          setState(data);
        }
      } catch {
        // ポーリング失敗時は次回に任せる（オフィス側の表示のみの機能のため
        // ここでユーザーにエラーを出す必要はない）
      } finally {
        isFetching.current = false;
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const notifications = state.employees.filter(
    (employee) => employee.needsAttention
  );

  const teams = groupByTeam(state.employees);
  const membersByTeam = new Map(teams);
  const roomTeamNames = new Set(state.rooms.map((room) => room.teamName));

  // 部屋が定義されていないチームも、従来どおりフロアに表示する
  const roomlessTeams = teams.filter(([teamName]) => !roomTeamNames.has(teamName));

  return (
    <div className="min-h-[calc(100dvh-72px)] bg-gradient-to-b from-[#EFF6FC] via-[#F7FBFD] to-white">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {/* オフィスヘッダー */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123B5D] text-white">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-[#123B5D] md:text-2xl">
                Atlas Office
              </h1>
              <p className="text-xs text-[#6B8498] md:text-sm">
                AI社員たちが働くバーチャルオフィス
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#DCEAF2] bg-white px-4 py-2 text-sm text-[#406783] shadow-sm">
            <Clock className="h-4 w-4 text-[#1478B8]" />
            {now ? formatTime(now) : '--:--'}
          </div>
        </div>

        {/* 通知 */}
        {notifications.length > 0 && (
          <div className="mb-8 space-y-2">
            {notifications.map((employee) => (
              <Link
                key={employee.id}
                href={employee.conversationRoute}
                className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3.5 shadow-sm transition hover:border-orange-300 hover:bg-orange-100/70"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Bell className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-orange-900">
                    {employee.name}（{employee.role}）
                  </span>
                  <span className="block text-sm text-orange-800">
                    {employee.notificationMessage}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* オフィスフロア */}
        <div className="space-y-6">
          {state.rooms.map((room) => (
            <RoomPanel
              key={room.id}
              room={room}
              members={membersByTeam.get(room.teamName) ?? []}
            />
          ))}

          {roomlessTeams.map(([teamName, members]) => (
            <div
              key={teamName}
              className="relative overflow-hidden rounded-3xl border border-[#E1EBF1] bg-white/80 p-6 shadow-sm backdrop-blur"
            >
              <p className="relative mb-6 text-xs font-semibold tracking-wide text-[#6B8498]">
                {teamName}
              </p>

              <MemberList members={members} />
            </div>
          ))}
        </div>

        {/* TODAY'S WORK */}
        <div className="mt-8 rounded-3xl border border-[#E1EBF1] bg-white p-6 shadow-sm">
          <p className="mb-5 text-xs font-semibold tracking-wide text-[#6B8498]">
            TODAY&apos;S WORK
          </p>

          {state.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              本日はまだ活動記録がありません。
            </p>
          ) : (
            <ol className="space-y-4">
              {state.activity.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex w-14 shrink-0 flex-col items-end pt-0.5">
                    <span className="text-xs font-medium text-[#6B8498]">
                      {formatTime(entry.time)}
                    </span>
                  </div>

                  <div className="relative flex shrink-0 flex-col items-center">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        entry.isNotification
                          ? 'bg-orange-500'
                          : 'bg-[#1478B8]'
                      }`}
                    />
                    <span className="mt-1 w-px flex-1 bg-[#E1EBF1]" />
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-sm">
                      {entry.isNotification && (
                        <Bell className="mr-1 inline-block h-3.5 w-3.5 text-orange-500" />
                      )}
                      <span className="font-semibold text-[#123B5D]">
                        {entry.employeeName}
                      </span>
                      <span className="ml-1.5 text-xs text-[#6B8498]">
                        {entry.employeeRole}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">{entry.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
