import { findLeaderboardRows } from '@/lib/server/leaderboard/repository';
import type { LeaderboardEntry } from '@/lib/shared/types';

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const rows = await findLeaderboardRows();

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    nickname: row.nickname,
    totalPoints: row.totalPoints,
  }));
}
