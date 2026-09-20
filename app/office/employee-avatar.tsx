'use client';

import { useState } from 'react';

import type { OfficeEmployee, OfficeEmployeeStatus } from '@/lib/office/types';

const RING_CLASSES: Record<OfficeEmployeeStatus, string> = {
  idle: 'ring-gray-200',
  working: 'ring-[#1478B8]',
  researching: 'ring-[#1478B8]',
  writing: 'ring-[#1478B8]',
  reviewing: 'ring-[#1478B8]',
  awaiting_owner: 'ring-orange-400',
  done: 'ring-emerald-400',
  error: 'ring-red-400',
};

const DOT_CLASSES: Record<OfficeEmployeeStatus, string> = {
  idle: 'bg-gray-300',
  working: 'bg-[#1478B8]',
  researching: 'bg-[#1478B8]',
  writing: 'bg-[#1478B8]',
  reviewing: 'bg-[#1478B8]',
  awaiting_owner: 'bg-orange-500',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
};

const ACTIVE_STATUSES: OfficeEmployeeStatus[] = [
  'working',
  'researching',
  'writing',
  'reviewing',
];

const AVATAR_BG = [
  'bg-[#DCEEFB]',
  'bg-[#FCE7DA]',
  'bg-[#E4E8FC]',
  'bg-[#DFF3EA]',
];

function initialsOf(name: string): string {
  return name.slice(0, 2);
}

function colorIndexOf(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) {
    sum += id.charCodeAt(i);
  }
  return sum % AVATAR_BG.length;
}

export function EmployeeAvatar({
  employee,
  size = 64,
}: {
  employee: OfficeEmployee;
  size?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const isActive = ACTIVE_STATUSES.includes(employee.status);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className={`h-full w-full overflow-hidden rounded-full ring-4 ${RING_CLASSES[employee.status]} transition-all`}
      >
        {!imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={employee.avatar}
            alt={employee.name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center text-lg font-bold text-[#123B5D] ${AVATAR_BG[colorIndexOf(employee.id)]}`}
          >
            {initialsOf(employee.name)}
          </div>
        )}
      </div>

      <span
        className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${DOT_CLASSES[employee.status]} ${
          isActive ? 'animate-pulse' : ''
        }`}
      />
    </div>
  );
}
