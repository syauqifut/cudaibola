import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export type UserRecord = {
  id: string;
  nickname: string;
  createdAt: Date;
};

export async function upsertUser(
  userId: string,
  nickname: string,
): Promise<UserRecord> {
  const [row] = await db
    .insert(users)
    .values({
      id: userId,
      nickname,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        nickname: sql`excluded.nickname`,
      },
    })
    .returning({
      id: users.id,
      nickname: users.nickname,
      createdAt: users.createdAt,
    });

  if (!row) {
    throw new Error(`Failed to upsert user ${userId}`);
  }

  return row;
}
