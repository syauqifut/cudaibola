import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { predictions, users } from '@/lib/db/schema';

export type LeaderboardRow = {
  userId: string;
  nickname: string;
  totalPoints: number;
};

/**
 * Klasemen di-scope ke satu season (SPEC.md 5a). Filter season ada di kondisi JOIN
 * (bukan WHERE) supaya user tanpa prediksi di season ini tetap muncul dengan 0 poin.
 */
export async function findLeaderboardRows(
  seasonId: string,
): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      nickname: users.nickname,
      totalPoints:
        sql<number>`COALESCE(SUM(${predictions.pointsEarned}), 0)`.mapWith(Number),
    })
    .from(users)
    .leftJoin(
      predictions,
      and(
        eq(predictions.userId, users.id),
        eq(predictions.seasonId, seasonId),
      ),
    )
    .groupBy(users.id, users.nickname)
    .orderBy(
      desc(sql`COALESCE(SUM(${predictions.pointsEarned}), 0)`),
      users.nickname,
    );

  return rows;
}
