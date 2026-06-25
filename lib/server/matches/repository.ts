import { and, asc, eq, gte, lte, or } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { competitions, matches } from '@/lib/db/schema';
import type { MatchWithCompetition } from '@/lib/shared/types';

export async function findTodayMatches(
  startUtc: Date,
  endUtc: Date,
): Promise<MatchWithCompetition[]> {
  const rows = await db
    .select({
      id: matches.id,
      providerMatchId: matches.providerMatchId,
      competitionId: matches.competitionId,
      roundName: matches.roundName,
      homeTeamName: matches.homeTeamName,
      awayTeamName: matches.awayTeamName,
      homeTeamLogoUrl: matches.homeTeamLogoUrl,
      awayTeamLogoUrl: matches.awayTeamLogoUrl,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      minute: matches.minute,
      kickoffTime: matches.kickoffTime,
      lastSyncedAt: matches.lastSyncedAt,
      createdAt: matches.createdAt,
      competitionName: competitions.name,
      competitionShortName: competitions.shortName,
      competitionLogoUrl: competitions.logoUrl,
      competitionPriorityOrder: competitions.priorityOrder,
    })
    .from(matches)
    .innerJoin(competitions, eq(matches.competitionId, competitions.id))
    .where(
      or(
        and(gte(matches.kickoffTime, startUtc), lte(matches.kickoffTime, endUtc)),
        eq(matches.status, 'live'),
      ),
    )
    .orderBy(asc(competitions.priorityOrder), asc(matches.kickoffTime));

  return rows;
}
