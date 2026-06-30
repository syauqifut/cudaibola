const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';

// Kalau sisa quota menit di bawah angka ini, tahan request berikutnya sampai counter reset.
const MIN_REQUESTS_BEFORE_THROTTLE = 3;

// Batas aman waktu tunggu saat self-throttle — counter football-data.org reset per menit,
// jadi tidak masuk akal menunggu lebih lama dari ini walau header memberi nilai aneh.
const MAX_THROTTLE_WAIT_MS = 60_000;

export type ProviderMatchStatus = 'scheduled' | 'live' | 'finished';

export type FootballDataTeam = {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
};

export type FootballDataScoreTotals = {
  home: number | null;
  away: number | null;
};

export type FootballDataScore = {
  winner?: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration?: string;
  fullTime: FootballDataScoreTotals;
  halfTime?: FootballDataScoreTotals;
};

export type FootballDataCompetition = {
  id: number;
  name: string;
  code: string;
  type?: string;
  emblem?: string | null;
};

export type FootballDataGoal = {
  minute?: number | null;
  injuryTime?: number | null;
  type?: string | null;
  team?: { id?: number; name: string } | null;
  scorer?: { id?: number; name: string } | null;
  assist?: { id?: number; name: string } | null;
  score?: FootballDataScoreTotals | null;
};

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number | null;
  stage?: string | null;
  group?: string | null;
  minute?: number | null;
  injuryTime?: number | null;
  competition?: FootballDataCompetition;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: FootballDataScore;
  /** Hanya tersedia di GET /matches/{id} (best-effort, lihat fetchMatchById). */
  goals?: FootballDataGoal[];
};

export type FootballDataResultSet = {
  count: number;
  first?: string;
  last?: string;
  played?: number;
};

/** Response dari GET /competitions/{code}/matches. */
export type FootballDataMatchesResponse = {
  filters?: Record<string, unknown>;
  resultSet?: FootballDataResultSet;
  competition?: FootballDataCompetition;
  matches: FootballDataMatch[];
};

/** Rentang tanggal untuk filter matches. Format `YYYY-MM-DD`; `dateTo` bersifat eksklusif. */
export type FetchCompetitionMatchesRange = {
  dateFrom: string;
  dateTo: string;
};

/**
 * Map status enum football-data.org v4 → status internal.
 * IN_PLAY/PAUSED/HALFTIME → live; FINISHED/AWARDED → finished; sisanya → scheduled.
 */
export function mapProviderStatus(status: string): ProviderMatchStatus {
  const liveStatuses = ['IN_PLAY', 'PAUSED', 'HALFTIME'];
  const finishedStatuses = ['FINISHED', 'AWARDED'];
  const cancelledStatuses = ['POSTPONED', 'SUSPENDED', 'CANCELLED'];

  if (finishedStatuses.includes(status)) return 'finished';
  if (liveStatuses.includes(status)) return 'live';
  // SCHEDULED, TIMED, dan cancelledStatuses (POSTPONED/SUSPENDED/CANCELLED) serta status tak
  // dikenal → scheduled. Lebih aman tampil sebagai "belum mulai" daripada salah kunci prediksi.
  void cancelledStatuses;
  return 'scheduled';
}

function getApiKey(): string {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      'FOOTBALL_DATA_API_KEY is not set — set it in the environment before calling the ' +
        'football-data.org client (lihat SPEC.md bagian 7).',
    );
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// State rate limit terakhir yang diketahui dari header response. Dipakai untuk self-throttle
// antar request berurutan dalam satu siklus fetch (mis. loop per competition code).
let lastRateLimit: { available: number; resetAt: number | null } | null = null;

function recordRateLimit(response: Response): void {
  const availableRaw = response.headers.get('X-Requests-Available-Minute');
  if (availableRaw === null) return;

  const available = Number.parseInt(availableRaw, 10);
  if (Number.isNaN(available)) return;

  // X-RequestCounter-Reset = jumlah detik tersisa sampai counter menit di-reset.
  let resetAt: number | null = null;
  const resetRaw = response.headers.get('X-RequestCounter-Reset');
  if (resetRaw !== null) {
    const resetSeconds = Number.parseInt(resetRaw, 10);
    if (!Number.isNaN(resetSeconds)) {
      resetAt = Date.now() + resetSeconds * 1000;
    }
  }

  lastRateLimit = { available, resetAt };
}

async function throttleIfNeeded(): Promise<void> {
  if (lastRateLimit === null) return;
  if (lastRateLimit.available >= MIN_REQUESTS_BEFORE_THROTTLE) return;
  if (lastRateLimit.resetAt === null) return;

  const waitMs = Math.min(lastRateLimit.resetAt - Date.now(), MAX_THROTTLE_WAIT_MS);
  if (waitMs > 0) {
    console.warn(
      `[football-data-client] Sisa quota menit ${lastRateLimit.available} (< ${MIN_REQUESTS_BEFORE_THROTTLE}), ` +
        `menahan request ~${Math.ceil(waitMs / 1000)}s sampai counter reset.`,
    );
    await sleep(waitMs);
  }

  // Setelah menunggu sampai reset, anggap quota sudah segar lagi — jangan menunggu dua kali.
  lastRateLimit = null;
}

async function footballDataGet<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
  await throttleIfNeeded();

  // Catatan: base URL mengandung path `/v4`, jadi gabungkan sebagai string — JANGAN pakai
  // `new URL(path, base)` karena path absolut akan membuang segmen `/v4`.
  const url = new URL(`${FOOTBALL_DATA_BASE_URL}${path}`);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Auth-Token': getApiKey(),
    },
    cache: 'no-store',
  });

  recordRateLimit(response);

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      // ignore body read errors
    }
    throw new Error(
      `football-data.org request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * GET /competitions/{code}/matches — daftar match satu kompetisi dalam rentang tanggal.
 * `code` adalah competition code football-data.org (mis. 'PL', 'WC'). `dateTo` eksklusif.
 */
export async function fetchCompetitionMatches(
  code: string,
  { dateFrom, dateTo }: FetchCompetitionMatchesRange,
): Promise<FootballDataMatchesResponse> {
  const searchParams = new URLSearchParams({ dateFrom, dateTo });
  return footballDataGet<FootballDataMatchesResponse>(
    `/competitions/${encodeURIComponent(code)}/matches`,
    searchParams,
  );
}

/**
 * GET /matches/{id} — detail satu match, termasuk `goals` (best-effort, untuk "Jalannya gol").
 * Dipakai hanya untuk match live/finished; data gol bisa kosong tergantung plan.
 */
export async function fetchMatchById(id: number | string): Promise<FootballDataMatch> {
  return footballDataGet<FootballDataMatch>(`/matches/${encodeURIComponent(String(id))}`);
}
