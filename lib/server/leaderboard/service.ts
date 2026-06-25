import { findLeaderboardRows } from '@/lib/server/leaderboard/repository';
import { getCurrentSeason } from '@/lib/server/season/service';
import type { LeaderboardEntry } from '@/lib/shared/types';

export type LeaderboardResult = {
  seasonId: string;
  seasonLabel: string;
  entries: LeaderboardEntry[];
};

/** Klasemen default = season aktif (bukan SUM all-time). Lihat SPEC.md 5a. */
export async function getLeaderboard(): Promise<LeaderboardResult> {
  const season = await getCurrentSeason();
  const rows = await findLeaderboardRows(season.id);

  const entries = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    nickname: row.nickname,
    totalPoints: row.totalPoints,
  }));

  return {
    seasonId: season.id,
    seasonLabel: season.label,
    entries,
  };
}
