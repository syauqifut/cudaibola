import { calculateAndSavePointsForMatch } from '@/lib/server/predictions/service';
import { TRACKED_LEAGUES } from '@/lib/shared/constants';
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

type TrackedLeague = (typeof TRACKED_LEAGUES)[number];

export type SyncMatchesResult = {
  skipped: boolean;
  syncedCount: number;
  scoredMatchCount: number;
  /** Jumlah liga yang gagal di-sync (di-skip, tidak menggagalkan sync keseluruhan). */
  leagueErrorCount: number;
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

async function fetchAllMatchesForLeagueDate(
  league: TrackedLeague,
  date: string,
): Promise<HighlightlyMatch[]> {
  const allMatches: HighlightlyMatch[] = [];
  let offset = 0;

  while (true) {
    const response = await fetchMatches({
      leagueId: Number(league.providerLeagueId),
      season: 'season' in league ? league.season : undefined,
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

function mapCompetitionInput(
  match: HighlightlyMatch,
  priorityOrder: number,
): UpsertCompetitionInput {
  return {
    providerCompetitionId: String(match.league.id),
    name: match.league.name,
    logoUrl: match.league.logo ?? null,
    priorityOrder,
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

async function syncSingleLeague(
  league: TrackedLeague,
  dates: string[],
): Promise<{ syncedCount: number; scoredMatchCount: number }> {
  const byProviderId = new Map<number, HighlightlyMatch>();

  for (const date of dates) {
    const matchesForDate = await fetchAllMatchesForLeagueDate(league, date);
    for (const match of matchesForDate) {
      byProviderId.set(match.id, match);
    }
  }

  let syncedCount = 0;
  let scoredMatchCount = 0;

  for (const providerMatch of byProviderId.values()) {
    // Defensive guard: hanya proses match yang benar milik liga ini, jangan sampai
    // match dari liga lain ikut masuk DB (DoD: tidak boleh ada liga di luar TRACKED_LEAGUES).
    if (String(providerMatch.league.id) !== league.providerLeagueId) {
      console.warn(
        `[sync] Match ${providerMatch.id} mengembalikan league.id ${providerMatch.league.id} ` +
          `padahal query liga ${league.name} (${league.providerLeagueId}) — di-skip.`,
      );
      continue;
    }

    const providerMatchId = String(providerMatch.id);
    const previousStatus = await findMatchStatusByProviderMatchId(providerMatchId);
    const matchInput = mapMatchInput(providerMatch);
    const newStatus = matchInput.status;

    const { matchId } = await upsertCompetitionAndMatch(
      mapCompetitionInput(providerMatch, league.priorityOrder),
      matchInput,
    );
    syncedCount += 1;

    if (previousStatus !== 'finished' && newStatus === 'finished') {
      try {
        await calculateAndSavePointsForMatch(matchId);
        scoredMatchCount += 1;
      } catch (error) {
        console.error(`[sync] Scoring failed for match ${matchId}:`, error);
      }
    }
  }

  return { syncedCount, scoredMatchCount };
}

export async function syncMatchesFromProvider(): Promise<SyncMatchesResult> {
  assertHighlightlyApiKey();

  const gotLock = await tryAcquireSyncLock(SYNC_LOCK_KEY);
  if (!gotLock) {
    console.log('Sync sebelumnya masih berjalan, skip eksekusi ini.');
    return { skipped: true, syncedCount: 0, scoredMatchCount: 0, leagueErrorCount: 0 };
  }

  try {
    const dates = getUtcDateStringsForSync();
    let syncedCount = 0;
    let scoredMatchCount = 0;
    let leagueErrorCount = 0;

    // Fetch per liga (bukan satu fetch tanpa filter) — scope tertutup ke 6 liga tracked.
    for (const league of TRACKED_LEAGUES) {
      try {
        const result = await syncSingleLeague(league, dates);
        syncedCount += result.syncedCount;
        scoredMatchCount += result.scoredMatchCount;
      } catch (error) {
        // Error per-liga tidak menggagalkan seluruh sync — log warning, lanjut liga berikutnya.
        leagueErrorCount += 1;
        console.warn(
          `[sync] Liga ${league.name} (${league.providerLeagueId}) gagal di-sync, di-skip:`,
          error,
        );
      }
    }

    return { skipped: false, syncedCount, scoredMatchCount, leagueErrorCount };
  } finally {
    await releaseSyncLock(SYNC_LOCK_KEY);
  }
}
