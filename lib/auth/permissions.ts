import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

export async function isAdmin(userId: number): Promise<boolean> {
  const result = await db
    .select({
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt)
      )
    )
    .limit(1);

  return result[0]?.role === 'owner';
}