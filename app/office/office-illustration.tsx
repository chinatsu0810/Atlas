'use client';

import Link from 'next/link';
import { DoorOpen } from 'lucide-react';

import type {
  OfficeEmployee,
  OfficeEmployeeStatus,
  OfficeRoom,
} from '@/lib/office/types';

// オフィスを上から見たフロアマップ風の小さなイラスト。社員のステータスに合わせて
// アイコンの縁が光ったりバッジが付いたりする。部屋を押すとその部屋の入口へ移動する。

const VIEW_W = 640;
const VIEW_H = 360;
const PAD = 14;
const GAP = 12;
const LEFT_W = 290;

// 色味を抑えたフロアの配色
const C = {
  floor: '#6F8B8F',
  zone: 'rgba(255,255,255,0.06)',
  room: '#A8BBBD',
  roomLine: '#C4D2D3',
  bar: '#58727A',
  desk: '#F2F1ED',
  deskShadow: 'rgba(40,60,64,0.18)',
  label: '#E4ECEC',
  darkText: '#3E5A60',
  table: '#CDBFA6',
  tableLine: '#B5A68C',
  leaf1: '#6C8E72',
  leaf2: '#5D7F64',
  leaf3: '#7F9F82',
  flower: '#C9978A',
  lounge: '#CFC7B3',
  bean1: '#B59C82',
  bean2: '#9EAD8E',
};

const ACTIVE_STATUSES: OfficeEmployeeStatus[] = [
  'working',
  'researching',
  'writing',
  'reviewing',
];

const STATUS_COLOR: Record<OfficeEmployeeStatus, string | null> = {
  idle: null,
  working: '#8DB7D2',
  researching: '#8DB7D2',
  writing: '#8DB7D2',
  reviewing: '#8DB7D2',
  awaiting_owner: '#DDA06F',
  done: '#9CC3A0',
  error: '#D58C85',
};

const AVATAR_BG = ['#E6DCCF', '#D7E0E6', '#E3D6DC', '#D8E3D6', '#E7E1CB', '#DAD7E8'];

function hashOf(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i) * (i + 1);
  return sum;
}

type Box = { x: number; y: number; w: number; h: number };

function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

function isActive(employee: OfficeEmployee): boolean {
  return ACTIVE_STATUSES.includes(employee.status);
}

// 丸アイコン＋右上のバッジ（作業中は「…」、確認待ちは「?」、完了は「✓」、エラーは「!」）
function Avatar({ x, y, employee }: { x: number; y: number; employee: OfficeEmployee }) {
  const ring = STATUS_COLOR[employee.status];
  const active = isActive(employee);
  const r = 11;

  return (
    <g>
      <title>{`${employee.name}（${employee.statusLabel}）${employee.currentTask ? `\n${employee.currentTask}` : ''}`}</title>
      {active && ring && (
        <circle
          cx={x}
          cy={y}
          r={r + 3}
          fill="none"
          stroke={ring}
          strokeWidth={2}
          className="office-ripple"
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}
      <circle cx={x} cy={y + 1.5} r={r + 1.5} fill={C.deskShadow} />
      <circle cx={x} cy={y} r={r + 1.5} fill={ring ?? '#FFFFFF'} />
      <circle cx={x} cy={y} r={r - 0.5} fill={AVATAR_BG[hashOf(employee.id) % AVATAR_BG.length]} />
      <text x={x} y={y + 3.6} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.darkText}>
        {employee.name.slice(0, 1)}
      </text>

      {ring && (
        <g transform={`translate(${x + 9} ${y - 9})`}>
          <circle r={5.5} fill="#FFFFFF" stroke={ring} strokeWidth={1.2} />
          {active ? (
            [-2.4, 0, 2.4].map((dx, i) => (
              <circle
                key={dx}
                cx={dx}
                cy={0}
                r={0.9}
                fill={C.darkText}
                className="office-typing-dot"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))
          ) : (
            <text y={2.6} textAnchor="middle" fontSize={7} fontWeight={700} fill={C.darkText}>
              {employee.status === 'awaiting_owner' ? '?' : employee.status === 'done' ? '✓' : '!'}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function Name({ x, y, name, dark = false }: { x: number; y: number; name: string; dark?: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={8}
      fontWeight={700}
      fill={dark ? C.darkText : C.label}
      className="office-name"
    >
      {name}
    </text>
  );
}

function Shrub({ x, y, flower = false }: { x: number; y: number; flower?: boolean }) {
  return (
    <g>
      <circle cx={x - 7} cy={y + 2} r={9} fill={C.leaf2} />
      <circle cx={x + 6} cy={y + 3} r={8} fill={C.leaf1} />
      <circle cx={x} cy={y - 6} r={9} fill={C.leaf3} />
      {flower && (
        <>
          <circle cx={x + 7} cy={y - 5} r={2.6} fill={C.flower} />
          <circle cx={x - 5} cy={y + 6} r={2.2} fill={C.flower} />
        </>
      )}
    </g>
  );
}

// 上から見た机（椅子の背もたれ付き）。side は椅子のある側
function Desk({ x, y, side }: { x: number; y: number; side: 'top' | 'bottom' }) {
  const w = 34;
  const h = 28;
  const chairY = side === 'top' ? y - h / 2 - 8 : y + h / 2 + 3;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2 + 2} width={w} height={h} rx={4} fill={C.deskShadow} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} fill={C.desk} />
      <rect x={x - 13} y={chairY} width={26} height={5} rx={2.5} fill={C.desk} />
    </g>
  );
}

// デスクの島：中央の長机をはさんで、上下に机が向かい合う
function DeskIsland({ box, members }: { box: Box; members: OfficeEmployee[] }) {
  const cols = Math.max(Math.ceil(members.length / 2), 1);
  const spacing = Math.min(62, (box.w - 70) / cols);
  const startX = box.x + (box.w - 36 - spacing * cols) / 2 + spacing / 2;
  const barY = box.y + box.h / 2 + 8;
  const topY = barY - 22;
  const bottomY = barY + 22;
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={14} fill={C.zone} />

      <rect x={startX - spacing / 2 + 4} y={barY - 4} width={spacing * cols - 8} height={8} rx={4} fill={C.bar} />

      {Array.from({ length: cols * 2 }, (_, i) => {
        const isTop = i < cols;
        const x = startX + (i % cols) * spacing;
        const y = isTop ? topY : bottomY;
        const employee = members[i];
        return (
          <g key={i}>
            <Desk x={x} y={y} side={isTop ? 'top' : 'bottom'} />
            {employee && (
              <>
                <Avatar x={x} y={y} employee={employee} />
                <Name x={x} y={isTop ? y - 26 : y + 32} name={employee.name} />
              </>
            )}
          </g>
        );
      })}

      <Shrub x={box.x + box.w - 22} y={barY + 4} />
    </g>
  );
}

function MeetingRoom({ box, members }: { box: Box; members: OfficeEmployee[] }) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + 12;
  const inSession = members.some((m) => m.status !== 'idle');

  // 席順：左端（社長）→ 上下に3席ずつ → 右端（監査）
  const cols = [-50, 0, 50];
  const seats: { x: number; y: number; name: 'above' | 'below' }[] = [
    { x: cx - 100, y: cy, name: 'below' },
    ...cols.flatMap((dx) => [
      { x: cx + dx, y: cy - 38, name: 'above' as const },
      { x: cx + dx, y: cy + 38, name: 'below' as const },
    ]),
    { x: cx + 100, y: cy, name: 'below' },
  ];

  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} fill={C.room} />
      <rect
        x={box.x + 1}
        y={box.y + 1}
        width={box.w - 2}
        height={box.h - 2}
        rx={5}
        fill="none"
        stroke={C.roomLine}
        strokeWidth={2}
      />

      {/* テーブルと資料 */}
      <rect x={cx - 82} y={cy - 18} width={164} height={40} rx={20} fill={C.deskShadow} />
      <rect x={cx - 82} y={cy - 20} width={164} height={40} rx={20} fill={C.table} stroke={C.tableLine} strokeWidth={1.5} />
      {inSession && (
        <>
          <rect x={cx - 34} y={cy - 9} width={12} height={16} rx={1.5} fill="#F7F5F0" transform={`rotate(-8 ${cx - 28} ${cy - 1})`} />
          <rect x={cx + 20} y={cy - 7} width={12} height={16} rx={1.5} fill="#F7F5F0" transform={`rotate(10 ${cx + 26} ${cy + 1})`} />
        </>
      )}
      <circle cx={cx - 4} cy={cy + 2} r={4} fill="#F7F5F0" stroke={C.tableLine} />

      {members.slice(0, seats.length).map((employee, i) => {
        const seat = seats[i];
        return (
          <g key={employee.id}>
            <Avatar x={seat.x} y={seat.y} employee={employee} />
            <Name
              x={seat.x}
              y={seat.name === 'above' ? seat.y - 17 : seat.y + 23}
              name={employee.name}
              dark
            />
          </g>
        );
      })}
    </g>
  );
}

// 右下のラウンジ（飾り）
function Lounge({ box }: { box: Box }) {
  const tx = box.x + 52;
  const ty = box.y + box.h / 2;
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={12} fill={C.lounge} />
      {/* 丸テーブルとコーヒー */}
      <rect x={tx - 14} y={ty - 42} width={28} height={9} rx={3} fill="#B9A487" />
      <rect x={tx - 14} y={ty + 33} width={28} height={9} rx={3} fill="#B9A487" />
      <circle cx={tx} cy={ty} r={28} fill="#5E767B" />
      {[
        [-12, -10],
        [12, -8],
        [-8, 12],
        [13, 12],
      ].map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} cx={tx + dx} cy={ty + dy} r={5.5} fill="#EDE8DE" stroke="#A89A84" />
      ))}

      <path
        d={`M${box.x + box.w - 120} ${box.y + 30} q30 -22 52 4 q14 20 -8 38 q-24 16 -44 -4 q-14 -18 0 -38 z`}
        fill={C.bean1}
        opacity={0.85}
      />
      <path
        d={`M${box.x + box.w - 58} ${box.y + 58} q26 -14 40 8 q10 22 -12 34 q-24 10 -34 -10 q-8 -18 6 -32 z`}
        fill={C.bean2}
        opacity={0.85}
      />
      <text x={box.x + 104} y={box.y + box.h / 2 + 4} fontSize={13} fontWeight={600} fill="#8C8270" letterSpacing={0.5}>
        Lounge
      </text>
    </g>
  );
}

// 部屋名はSVGの拡大縮小に左右されないよう、HTMLの文字で重ねる（下のパネルと同じ大きさ）
function RoomLink({
  box,
  room,
  label,
  active,
  badge,
  dark = false,
}: {
  box: Box;
  room: OfficeRoom;
  label: string;
  active: boolean;
  badge?: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={room.enterRoute}
      aria-label={`${room.name}へ`}
      className="group absolute rounded-[10px] outline-none ring-white/70 transition hover:bg-white/10 hover:ring-2 focus-visible:ring-2"
      style={{
        left: pct(box.x, VIEW_W),
        top: pct(box.y, VIEW_H),
        width: pct(box.w, VIEW_W),
        height: pct(box.h, VIEW_H),
      }}
    >
      <span className="absolute left-2.5 top-1.5 flex items-center gap-1.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            room.needsAttention ? 'bg-[#DDA06F]' : active ? 'animate-pulse bg-[#8DB7D2]' : 'bg-[#A9BABB]'
          }`}
        />
        <span className={`text-sm font-bold ${dark ? 'text-[#3E5A60]' : 'text-[#E4ECEC]'}`}>
          {room.name}
        </span>
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${
              room.needsAttention ? 'bg-[#DDA06F]' : 'bg-[#3E5A60]'
            }`}
          >
            {badge}
          </span>
        )}
      </span>

      <span
        className={`absolute right-1.5 top-1.5 hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm transition sm:inline-flex ${
          room.needsAttention
            ? 'bg-[#D98F57] text-white'
            : 'bg-white/85 text-[#3E5A60] group-hover:bg-white'
        }`}
      >
        <DoorOpen className="h-3 w-3" />
        {label}
      </span>
    </Link>
  );
}

const ANIMATIONS = `
.office-ripple { animation: office-ripple 1.8s ease-out infinite; }
@keyframes office-ripple { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.35); opacity: 0; } }
.office-pulse { animation: office-pulse 1.6s ease-in-out infinite; }
@keyframes office-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.office-typing-dot { animation: office-typing 1.1s ease-in-out infinite; }
@keyframes office-typing { 0%,60%,100% { opacity: .2; } 30% { opacity: 1; } }
@media (max-width: 480px) { .office-name { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .office-ripple, .office-pulse, .office-typing-dot { animation: none; }
}
`;

export function OfficeIllustration({
  rooms,
  membersByTeam,
}: {
  rooms: OfficeRoom[];
  membersByTeam: Map<string, OfficeEmployee[]>;
}) {
  const meetingRoom = rooms.find((room) => room.id === 'meeting-room') ?? null;
  const deskRooms = rooms.filter((room) => room !== meetingRoom);

  // 左：チームごとのデスクの島 ／ 右上：会議室 ／ 右下：ラウンジ
  const islandH =
    deskRooms.length > 0
      ? (VIEW_H - PAD * 2 - GAP * (deskRooms.length - 1)) / deskRooms.length
      : 0;
  const islandBoxes: Box[] = deskRooms.map((_, i) => ({
    x: PAD,
    y: PAD + i * (islandH + GAP),
    w: LEFT_W,
    h: islandH,
  }));

  const rightX = PAD + LEFT_W + GAP;
  const rightW = VIEW_W - rightX - PAD;
  const meetingBox: Box = { x: rightX, y: PAD, w: rightW, h: 190 };
  const loungeBox: Box = {
    x: rightX,
    y: PAD + meetingBox.h + GAP,
    w: rightW,
    h: VIEW_H - PAD * 2 - meetingBox.h - GAP,
  };

  const meetingInSession = (meetingRoom ? membersByTeam.get(meetingRoom.teamName) ?? [] : []).some(
    (m) => m.status !== 'idle'
  );

  // 開催中の会議があれば会議へ、なければ会議を開く画面へ
  const meetingLabel =
    meetingRoom && meetingRoom.enterRoute !== '/office/meeting' ? '会議に参加' : '会議を開く';

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="AI社員たちが働くオフィスのフロアマップ"
      >
        <style>{ANIMATIONS}</style>

        <rect width={VIEW_W} height={VIEW_H} fill={C.floor} />

        {deskRooms.map((room, i) => (
          <DeskIsland
            key={room.id}
            box={islandBoxes[i]}
            members={membersByTeam.get(room.teamName) ?? []}
          />
        ))}

        {meetingRoom && (
          <MeetingRoom
            box={meetingBox}
            members={membersByTeam.get(meetingRoom.teamName) ?? []}
          />
        )}

        <Lounge box={loungeBox} />
        <Shrub x={loungeBox.x + loungeBox.w - 16} y={loungeBox.y + loungeBox.h - 12} flower />
      </svg>

      {meetingRoom && (
        <RoomLink
          box={meetingBox}
          room={{ ...meetingRoom, name: '会議室' }}
          label={meetingLabel}
          active={meetingInSession}
          badge={meetingInSession ? '会議中' : undefined}
          dark
        />
      )}

      {deskRooms.map((room, i) => (
        <RoomLink
          key={room.id}
          box={islandBoxes[i]}
          room={room}
          label="のぞく"
          active={(membersByTeam.get(room.teamName) ?? []).some(isActive)}
        />
      ))}
    </div>
  );
}
