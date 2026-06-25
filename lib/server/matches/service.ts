import { groupMatchesByCompetition } from '@/lib/server/matches/grouping';
import { findMatchesForDate } from '@/lib/server/matches/repository';
import { getDateRangeUtc, isSameAppDay } from '@/lib/shared/format-time';
import type { CompetitionMatchGroup } from '@/lib/shared/types';

export async function getMatchesForDate(
  targetDate: Date = new Date(),
): Promise<CompetitionMatchGroup[]> {
  const { start, end } = getDateRangeUtc(targetDate);
  const isToday = isSameAppDay(targetDate, new Date());

  // includeLive (OR status=live) hanya saat targetDate = hari ini.
  const matches = await findMatchesForDate(start, end, isToday);
  return groupMatchesByCompetition(matches, isToday);
}
