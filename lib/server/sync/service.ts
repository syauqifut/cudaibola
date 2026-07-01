// Sync provider: football-data.org v4 (lihat .cursor/rules/20-domain-rules.mdc + 30-edge-cases.mdc).
//
// CATATAN DEPLOY (Step 3 migrasi Highlightly → football-data.org):
// `providerCompetitionId` sekarang adalah competition CODE ('PL', 'WC', ...) — bukan lagi ID
// numerik Highlightly. Baris `competitions` lama yang ber-providerCompetitionId numerik tidak
// akan cocok lagi. Tidak ada migration script di step ini: saat deploy, lakukan RESYNC /
// FRESH DB (kosongkan tabel competitions & matches lalu biarkan sync mengisi ulang) supaya
// tidak ada baris kompetisi yatim dengan ID provider format lama.
import { calculateAndSavePointsForMatch } from '@/lib/server/predictions/service';
import {
  TBD_TEAM_NAME,
  TRACKED_COMPETITIONS,
  type TrackedCompetition,
} from '@/lib/shared/constants';
import {
  fetchCompetitionMatches,
  mapProviderStatus,
  type FetchCompetitionMatchesRange,
  type FootballDataCompetition,
  type FootballDataMatch,
} from '@/lib/server/sync/football-data-client';
import {
  findMatchStatusByProviderMatchId,
  hasMatchesInRange,
  releaseSyncLock,
  tryAcquireSyncLock,
  upsertCompetitionAndMatch,
  type UpsertCompetitionInput,
  type UpsertMatchWithoutCompetitionInput,
} from '@/lib/server/sync/repository';

// Advisory lock TERPISAH per fungsi supaya syncLiveScores & syncUpcomingFixtures tidak saling
// blokir (lihat 30-edge-cases.mdc bagian 1).
const LIVE_SYNC_LOCK_KEY = 911234;
const FIXTURE_SYNC_LOCK_KEY = 911235;

// Window jadwal syncUpcomingFixtures: 5 minggu. dateTo eksklusif → pakai +36 hari untuk
// mencakup tepat 35 hari ke depan.
const UPCOMING_WINDOW_DAYS = 36;

export type SyncResult = {
  skipped: boolean;
  syncedCount: number;
  scoredMatchCount: number;
  /** Jumlah kompetisi yang gagal di-sync (di-skip, tidak menggagalkan sync keseluruhan). */
  competitionErrorCount: number;
};

const SKIPPED_RESULT: SyncResult = {
  skipped: true,
  syncedCount: 0,
  scoredMatchCount: 0,
  competitionErrorCount: 0,
};

function assertFootballDataApiKey(): void {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    throw new Error('FOOTBALL_DATA_API_KEY is not set');
  }
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function humanizeStage(stage: string): string {
  return stage
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** roundName dari stage + matchday, mis. "Regular Season - 38" atau "Matchday 38". */
function formatRoundName(
  stage?: string | null,
  matchday?: number | null,
): string | null {
  const stageLabel = stage ? humanizeStage(stage) : null;
  if (matchday != null) {
    return stageLabel ? `${stageLabel} - ${matchday}` : `Matchday ${matchday}`;
  }
  return stageLabel;
}

function mapCompetitionInput(
  competition: TrackedCompetition,
  providerCompetition: FootballDataCompetition | undefined,
): UpsertCompetitionInput {
  return {
    // providerCompetitionId = competition CODE (bukan numeric id).
    providerCompetitionId: competition.code,
    name: providerCompetition?.name ?? competition.name,
    logoUrl: providerCompetition?.emblem ?? null,
    priorityOrder: competition.priorityOrder,
  };
}

// Fixture knockout bisa punya slot tim yang belum ditentukan — provider mengirim
// `team.name = null`. Kolom nama tim NOT NULL, jadi simpan placeholder TBD (prediksi dikunci
// sampai kedua tim jelas, lihat submitPrediction & MatchDetailPopup).
function resolveTeamName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : TBD_TEAM_NAME;
}

function mapMatchInput(match: FootballDataMatch): UpsertMatchWithoutCompetitionInput {
  const status = mapProviderStatus(match.status);
  const isScheduled = status === 'scheduled';

  return {
    providerMatchId: String(match.id),
    roundName: formatRoundName(match.stage, match.matchday),
    homeTeamName: resolveTeamName(match.homeTeam?.name),
    awayTeamName: resolveTeamName(match.awayTeam?.name),
    homeTeamLogoUrl: match.homeTeam?.crest ?? null,
    awayTeamLogoUrl: match.awayTeam?.crest ?? null,
    // Skor sudah integer di fullTime; null saat match belum mulai.
    homeScore: isScheduled ? null : (match.score.fullTime.home ?? null),
    awayScore: isScheduled ? null : (match.score.fullTime.away ?? null),
    status,
    minute: status === 'live' ? (match.minute ?? null) : null,
    // utcDate sudah UTC — simpan apa adanya.
    kickoffTime: new Date(match.utcDate),
    lastSyncedAt: new Date(),
  };
}

async function syncSingleCompetition(
  competition: TrackedCompetition,
  range: FetchCompetitionMatchesRange,
): Promise<{ syncedCount: number; scoredMatchCount: number }> {
  const response = await fetchCompetitionMatches(competition.code, range);
  const competitionInput = mapCompetitionInput(competition, response.competition);

  let syncedCount = 0;
  let scoredMatchCount = 0;

  for (const match of response.matches) {
    const providerMatchId = String(match.id);
    // Baca status SEBELUM upsert untuk deteksi transisi → finished (scoring on transition).
    const previousStatus = await findMatchStatusByProviderMatchId(providerMatchId);
    const matchInput = mapMatchInput(match);
    const newStatus = matchInput.status;

    const { matchId } = await upsertCompetitionAndMatch(competitionInput, matchInput);
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

async function runSync(
  lockKey: number,
  label: string,
  range: FetchCompetitionMatchesRange,
): Promise<SyncResult> {
  assertFootballDataApiKey();

  const gotLock = await tryAcquireSyncLock(lockKey);
  if (!gotLock) {
    // Satu-satunya alasan skip: eksekusi sebelumnya masih jalan (cegah overlap tulis DB).
    console.log(`[sync] ${label} sebelumnya masih berjalan, skip eksekusi ini.`);
    return { ...SKIPPED_RESULT };
  }

  try {
    let syncedCount = 0;
    let scoredMatchCount = 0;
    let competitionErrorCount = 0;

    // Satu request per competition code — scope tertutup ke TRACKED_COMPETITIONS.
    for (const competition of TRACKED_COMPETITIONS) {
      try {
        const result = await syncSingleCompetition(competition, range);
        syncedCount += result.syncedCount;
        scoredMatchCount += result.scoredMatchCount;
      } catch (error) {
        // Error per-kompetisi tidak menggagalkan seluruh sync — log, lanjut kompetisi berikutnya.
        competitionErrorCount += 1;
        console.warn(
          `[sync] ${label}: kompetisi ${competition.name} (${competition.code}) gagal di-sync, di-skip:`,
          error,
        );
      }
    }

    return { skipped: false, syncedCount, scoredMatchCount, competitionErrorCount };
  } finally {
    await releaseSyncLock(lockKey);
  }
}

/**
 * Sync status & skor match HARI INI (scheduled/live/finished). Dipanggil worker setiap menit.
 * 1 request per competition: GET /competitions/{code}/matches?dateFrom={today}&dateTo={tomorrow}.
 */
export async function syncLiveScores(): Promise<SyncResult> {
  const now = new Date();
  const range: FetchCompetitionMatchesRange = {
    dateFrom: toUtcDateString(now),
    // dateTo eksklusif → besok, supaya hari ini benar-benar tercakup.
    dateTo: toUtcDateString(addUtcDays(now, 1)),
  };
  return runSync(LIVE_SYNC_LOCK_KEY, 'syncLiveScores', range);
}

/**
 * Sync jadwal match ~5 minggu ke depan. Dipanggil worker mingguan (Senin 03:00 WIB).
 * 1 request per competition: GET /competitions/{code}/matches?dateFrom={today}&dateTo={+36 hari}.
 */
export async function syncUpcomingFixtures(): Promise<SyncResult> {
  const now = new Date();
  const range: FetchCompetitionMatchesRange = {
    dateFrom: toUtcDateString(now),
    dateTo: toUtcDateString(addUtcDays(now, UPCOMING_WINDOW_DAYS)),
  };
  return runSync(FIXTURE_SYNC_LOCK_KEY, 'syncUpcomingFixtures', range);
}

/** Re-export helper bootstrap untuk worker (cek apakah tabel sudah punya jadwal). */
export { hasMatchesInRange };
