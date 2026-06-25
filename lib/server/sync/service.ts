import { calculateAndSavePointsForMatch } from '@/lib/server/predictions/service';
import {
  HIGHLIGHTLY_WORLD_CUP_LEAGUE_ID,
  HIGHLIGHTLY_WORLD_CUP_SEASON,
  WORLD_CUP_PRIORITY_ORDER,
} from '@/lib/shared/constants';
import {
  fetchMatches,
  mapProviderStatus,
  parseScore,
  type HighlightlyMatch,
} from '@/lib/server/sync/highlightly-client';
import {
  findMatchStatusByProviderMatchId,
  releaseSyncLock,
  tryAcquireSyncLock,
  upsertCompetitionAndMatch,
  type UpsertCompetitionInput,
  type UpsertMatchWithoutCompetitionInput,
} from '@/lib/server/sync/repository';

const SYNC_LOCK_KEY = 911234;
const MATCHES_PAGE_SIZE = 100;

export type SyncMatchesResult = {
  skipped: boolean;
  syncedCount: number;
  scoredMatchCount: number;
};

function assertHighlightlyApiKey(): void {
  if (!process.env.HIGHLIGHTLY_API_KEY) {
    throw new Error('HIGHLIGHTLY_API_KEY is not set');
  }
}

function getUtcDateStringsForSync(now: Date = new Date()): string[] {
  const today = now.toISOString().slice(0, 10);

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  return yesterdayStr === today ? [today] : [yesterdayStr, today];
}

async function fetchAllMatchesForDate(date: string): Promise<HighlightlyMatch[]> {
  const allMatches: HighlightlyMatch[] = [];
  let offset = 0;

  while (true) {
    const response = await fetchMatches({
      leagueId: HIGHLIGHTLY_WORLD_CUP_LEAGUE_ID,
      season: HIGHLIGHTLY_WORLD_CUP_SEASON,
      date,
      limit: MATCHES_PAGE_SIZE,
      offset,
    });

    allMatches.push(...response.data);

    const fetched = offset + response.data.length;
    if (fetched >= response.pagination.totalCount || response.data.length === 0) {
      break;
    }

    offset += MATCHES_PAGE_SIZE;
  }

  return allMatches;
}

async function fetchProviderMatches(): Promise<HighlightlyMatch[]> {
  const dates = getUtcDateStringsForSync();
  const byProviderId = new Map<number, HighlightlyMatch>();

  for (const date of dates) {
    const matchesForDate = await fetchAllMatchesForDate(date);
    for (const match of matchesForDate) {
      byProviderId.set(match.id, match);
    }
  }

  return [...byProviderId.values()];
}

function mapCompetitionInput(match: HighlightlyMatch): UpsertCompetitionInput {
  return {
    providerCompetitionId: String(match.league.id),
    name: match.league.name,
    logoUrl: match.league.logo ?? null,
    priorityOrder: WORLD_CUP_PRIORITY_ORDER,
  };
}

function mapMatchInput(match: HighlightlyMatch): UpsertMatchWithoutCompetitionInput {
  const status = mapProviderStatus(match.state.description);
  const score = parseScore(match.state.score?.current);
  const syncedAt = new Date();

  return {
    providerMatchId: String(match.id),
    roundName: match.round ?? null,
    homeTeamName: match.homeTeam.name,
    awayTeamName: match.awayTeam.name,
    homeTeamLogoUrl: match.homeTeam.logo ?? null,
    awayTeamLogoUrl: match.awayTeam.logo ?? null,
    homeScore: status === 'scheduled' ? null : score.home,
    awayScore: status === 'scheduled' ? null : score.away,
    status,
    minute: status === 'live' ? (match.state.clock ?? null) : null,
    kickoffTime: new Date(match.date),
    lastSyncedAt: syncedAt,
  };
}

export async function syncMatchesFromProvider(): Promise<SyncMatchesResult> {
  assertHighlightlyApiKey();

  const gotLock = await tryAcquireSyncLock(SYNC_LOCK_KEY);
  if (!gotLock) {
    console.log('Sync sebelumnya masih berjalan, skip eksekusi ini.');
    return { skipped: true, syncedCount: 0, scoredMatchCount: 0 };
  }

  try {
    const providerMatches = await fetchProviderMatches();
    let syncedCount = 0;
    let scoredMatchCount = 0;

    for (const providerMatch of providerMatches) {
      const providerMatchId = String(providerMatch.id);
      const previousStatus =
        await findMatchStatusByProviderMatchId(providerMatchId);
      const matchInput = mapMatchInput(providerMatch);
      const newStatus = matchInput.status;

      const { matchId } = await upsertCompetitionAndMatch(
        mapCompetitionInput(providerMatch),
        matchInput,
      );
      syncedCount += 1;

      if (previousStatus !== 'finished' && newStatus === 'finished') {
        try {
          await calculateAndSavePointsForMatch(matchId);
          scoredMatchCount += 1;
        } catch (error) {
          console.error(
            `[sync] Scoring failed for match ${matchId}:`,
            error,
          );
        }
      }
    }

    return { skipped: false, syncedCount, scoredMatchCount };
  } finally {
    await releaseSyncLock(SYNC_LOCK_KEY);
  }
}
