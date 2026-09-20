import { NextResponse } from 'next/server';

import { getUser } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth/permissions';
import { getOfficeState } from '@/lib/office/roster';

export async function GET() {
  const user = await getUser();

  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json(
      { error: 'このオフィスは運営のみ利用できます。' },
      { status: 403 }
    );
  }

  const state = await getOfficeState();
  return NextResponse.json(state);
}
