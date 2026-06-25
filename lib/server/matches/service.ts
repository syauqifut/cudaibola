import { groupMatchesByCompetition } from '@/lib/server/matches/grouping';
import { findTodayMatches } from '@/lib/server/matches/repository';
import { getTodayRangeUtc } from '@/lib/shared/format-time';
import type { CompetitionMatchGroup } from '@/lib/shared/types';

export async function getTodayMatches(): Promise<CompetitionMatchGroup[]> {
  const { start, end } = getTodayRangeUtc();
  const matches = await findTodayMatches(start, end);
  return groupMatchesByCompetition(matches);
}
