import { and, asc, eq, gte, lte, or } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { competitions, matches } from '@/lib/db/schema';
import type { MatchWithCompetition } from '@/lib/shared/types';

export async function findMatchesForDate(
  startUtc: Date,
  endUtc: Date,
  includeLive: boolean,
): Promise<MatchWithCompetition[]> {
  const dateRange = and(
    gte(matches.kickoffTime, startUtc),
    lte(matches.kickoffTime, endUtc),
  );

  // Live-pinning hanya saat targetDate = hari ini. Saat navigasi ke tanggal lain,
  // query murni rentang kickoff tanggal itu (tanpa OR status=live). Lihat SPEC.md 5b.
  const whereClause = includeLive
    ? or(dateRange, eq(matches.status, 'live'))
    : dateRange;

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
    .where(whereClause)
    .orderBy(asc(competitions.priorityOrder), asc(matches.kickoffTime));

  return rows;
}
