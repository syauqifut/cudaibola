const HIGHLIGHTLY_BASE_URL = 'https://soccer.highlightly.net';

const LIVE_STATES = [
  'First half',
  'Second half',
  'Half time',
  'Extra time',
  'Break time',
  'Penalties',
  'In progress',
  'Suspended',
  'Interrupted',
] as const;

const FINISHED_STATES = [
  'Finished',
  'Finished after penalties',
  'Finished after extra time',
  'Awarded',
  'Abandoned',
  'Cancelled',
] as const;

const PRIMARY_QUERY_KEYS = [
  'leagueName',
  'leagueId',
  'date',
  'season',
  'homeTeamId',
  'awayTeamId',
  'homeTeamName',
  'awayTeamName',
  'countryCode',
  'countryName',
] as const;

export type ProviderMatchStatus = 'scheduled' | 'live' | 'finished';

export type HighlightlyTeam = {
  id: number;
  name: string;
  logo?: string;
  type?: string;
};

export type HighlightlyLeague = {
  id: number;
  season: number;
  name: string;
  logo?: string;
};

export type HighlightlyMatchState = {
  description: string;
  clock?: number | null;
  score?: {
    current?: string;
    penalties?: string;
  };
};

export type HighlightlyMatch = {
  id: number;
  round?: string;
  date: string;
  homeTeam: HighlightlyTeam;
  awayTeam: HighlightlyTeam;
  league: HighlightlyLeague;
  state: HighlightlyMatchState;
};

export type HighlightlyPagination = {
  totalCount: number;
  offset: number;
  limit: number;
};

export type HighlightlyMatchesResponse = {
  data: HighlightlyMatch[];
  pagination: HighlightlyPagination;
  plan?: {
    tier?: string;
    message?: string;
  };
};

/** Primary query params accepted by GET /matches (see Highlightly docs). */
export type FetchMatchesPrimaryParams = {
  leagueName?: string;
  leagueId?: number;
  date?: string;
  season?: number;
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  countryCode?: string;
  countryName?: string;
};

/** Secondary params only — must be paired with at least one primary param. */
export type FetchMatchesSecondaryParams = {
  limit?: number;
  offset?: number;
};

export type FetchMatchesParams = FetchMatchesPrimaryParams & FetchMatchesSecondaryParams;

export function mapProviderStatus(description: string): ProviderMatchStatus {
  if (FINISHED_STATES.includes(description as (typeof FINISHED_STATES)[number])) {
    return 'finished';
  }
  if (LIVE_STATES.includes(description as (typeof LIVE_STATES)[number])) {
    return 'live';
  }
  return 'scheduled';
}

export function parseScore(
  current: string | undefined,
): { home: number | null; away: number | null } {
  if (!current) return { home: null, away: null };
  const [home, away] = current.split('-').map((s) => parseInt(s.trim(), 10));
  return {
    home: Number.isNaN(home) ? null : home,
    away: Number.isNaN(away) ? null : away,
  };
}

function getApiKey(): string {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY;
  if (!apiKey) {
    throw new Error('HIGHLIGHTLY_API_KEY is not set');
  }
  return apiKey;
}

function hasPrimaryQueryParam(params: FetchMatchesParams): boolean {
  return PRIMARY_QUERY_KEYS.some((key) => params[key] !== undefined && params[key] !== '');
}

function buildSearchParams(params: FetchMatchesParams): URLSearchParams {
  if (!hasPrimaryQueryParam(params)) {
    throw new Error(
      'fetchMatches requires at least one primary query param (e.g. leagueId, date). ' +
        'timezone, limit, and offset alone are not sufficient.',
    );
  }

  const searchParams = new URLSearchParams();

  for (const key of [...PRIMARY_QUERY_KEYS, 'limit', 'offset'] as const) {
    const value = params[key];
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}

function logRateLimitIfLow(response: Response): void {
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  if (remaining === null) return;

  const count = Number.parseInt(remaining, 10);
  if (!Number.isNaN(count) && count < 10) {
    console.warn(
      `[highlightly-client] Rate limit low: ${count} request(s) remaining today`,
    );
  }
}

async function highlightlyGet<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
  const url = new URL(path, HIGHLIGHTLY_BASE_URL);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': getApiKey(),
    },
    cache: 'no-store',
  });

  logRateLimitIfLow(response);

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      // ignore body read errors
    }
    throw new Error(
      `Highlightly request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
    );
  }

  return response.json() as Promise<T>;
}

/** GET /matches — list pertandingan dari Highlightly. */
export async function fetchMatches(
  params: FetchMatchesParams,
): Promise<HighlightlyMatchesResponse> {
  const searchParams = buildSearchParams(params);
  return highlightlyGet<HighlightlyMatchesResponse>('/matches', searchParams);
}
