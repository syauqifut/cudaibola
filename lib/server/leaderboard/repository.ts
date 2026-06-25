import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { predictions, users } from '@/lib/db/schema';

export type LeaderboardRow = {
  userId: string;
  nickname: string;
  totalPoints: number;
};

export async function findLeaderboardRows(): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      nickname: users.nickname,
      totalPoints:
        sql<number>`COALESCE(SUM(${predictions.pointsEarned}), 0)`.mapWith(Number),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id, users.nickname)
    .orderBy(
      desc(sql`COALESCE(SUM(${predictions.pointsEarned}), 0)`),
      users.nickname,
    );

  return rows;
}
