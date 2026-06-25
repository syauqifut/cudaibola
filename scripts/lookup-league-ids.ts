/**
 * One-time setup script: lookup Highlightly league IDs for the 6 tracked competitions.
 *
 * Run (API key from env only — never hardcode):
 *   set -a && source .env.local && set +a && npx tsx scripts/lookup-league-ids.ts
 *
 * See .cursor/rules/20-domain-rules.mdc — "Daftar liga".
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HIGHLIGHTLY_BASE_URL = 'https://soccer.highlightly.net';

type LookupTarget = {
  /** Label in TRACKED_LEAGUES / constants.ts */
  displayName: string;
  /** Value for GET /leagues?leagueName=... */
  leagueName: string;
  /** ISO country code filter; null for international tournaments (World Cup). */
  countryCode: string | null;
  /** Optional season filter (e.g. World Cup 2026). */
  season?: number;
  /** Cross-check only — IDs already verified in domain rules, not used without API hit. */
  verifiedProviderLeagueId?: string;
};

type HighlightlyLeagueRow = {
  id: number;
  name: string;
  logo?: string;
  country?: {
    code?: string;
    name?: string;
    logo?: string;
  };
  seasons?: { season: number }[];
};

type HighlightlyLeaguesResponse = {
  data: HighlightlyLeagueRow[];
  pagination: {
    totalCount: number;
    offset: number;
    limit: number;
  };
};

/** Matches .cursor/rules/20-domain-rules.mdc lookup table. */
const LOOKUP_TARGETS: LookupTarget[] = [
  {
    displayName: 'FIFA World Cup 2026',
    leagueName: 'World Cup',
    countryCode: null,
    season: 2026,
    verifiedProviderLeagueId: '1635',
  },
  {
    displayName: 'Premier League',
    leagueName: 'Premier League',
    countryCode: 'GB-ENG',
    verifiedProviderLeagueId: '33973',
  },
  { displayName: 'La Liga', leagueName: 'La Liga', countryCode: 'ES' },
  { displayName: 'Bundesliga', leagueName: 'Bundesliga', countryCode: 'DE' },
  { displayName: 'Serie A', leagueName: 'Serie A', countryCode: 'IT' },
  { displayName: 'Ligue 1', leagueName: 'Ligue 1', countryCode: 'FR' },
];

function loadEnvFile(filename: string): void {
  try {
    const content = readFileSync(join(process.cwd(), filename), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional local env file
  }
}

function getApiKey(): string {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY;
  if (!apiKey) {
    throw new Error(
      'HIGHLIGHTLY_API_KEY is not set. Export it or add to .env.local before running.',
    );
  }
  return apiKey;
}

function logRateLimitIfLow(response: Response): void {
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  if (remaining === null) return;
  const count = Number.parseInt(remaining, 10);
  if (!Number.isNaN(count) && count < 10) {
    console.warn(`[lookup-league-ids] Rate limit low: ${count} request(s) remaining today`);
  }
}

async function fetchLeaguesPage(
  target: LookupTarget,
  offset: number,
  limit: number,
): Promise<HighlightlyLeaguesResponse> {
  const params = new URLSearchParams({
    leagueName: target.leagueName,
    limit: String(limit),
    offset: String(offset),
  });

  if (target.countryCode) {
    params.set('countryCode', target.countryCode);
  }
  if (target.season !== undefined) {
    params.set('season', String(target.season));
  }

  const url = new URL('/leagues', HIGHLIGHTLY_BASE_URL);
  url.search = params.toString();

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-rapidapi-key': getApiKey() },
    cache: 'no-store',
  });

  logRateLimitIfLow(response);

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `GET /leagues failed for "${target.displayName}": ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
    );
  }

  return response.json() as Promise<HighlightlyLeaguesResponse>;
}

async function fetchAllLeagueCandidates(target: LookupTarget): Promise<HighlightlyLeagueRow[]> {
  const limit = 100;
  let offset = 0;
  const all: HighlightlyLeagueRow[] = [];

  while (true) {
    const page = await fetchLeaguesPage(target, offset, limit);
    all.push(...page.data);

    const nextOffset = page.pagination.offset + page.data.length;
    if (nextOffset >= page.pagination.totalCount || page.data.length === 0) {
      break;
    }
    offset = nextOffset;
  }

  return all;
}

function countryCodeMatches(row: HighlightlyLeagueRow, expected: string | null): boolean {
  const code = row.country?.code?.toUpperCase() ?? '';
  if (expected === null) {
    return code === 'WORLD' || code === '';
  }
  return code === expected.toUpperCase();
}

function summarizeRow(row: HighlightlyLeagueRow) {
  const seasons = row.seasons?.map((s) => s.season).join(', ') ?? '(none listed)';
  return {
    id: row.id,
    name: row.name,
    countryCode: row.country?.code ?? null,
    countryName: row.country?.name ?? null,
    seasons,
  };
}

type PickResult =
  | { status: 'ok'; providerLeagueId: string; picked: HighlightlyLeagueRow }
  | { status: 'manual'; reason: string }
  | { status: 'missing'; reason: string };

function pickProviderLeagueId(
  target: LookupTarget,
  candidates: HighlightlyLeagueRow[],
): PickResult {
  const byCountry = candidates.filter((row) => countryCodeMatches(row, target.countryCode));

  if (target.verifiedProviderLeagueId) {
    const verified = byCountry.find(
      (row) => String(row.id) === target.verifiedProviderLeagueId,
    );
    if (verified) {
      return {
        status: 'ok',
        providerLeagueId: target.verifiedProviderLeagueId,
        picked: verified,
      };
    }
  }

  const exactName = byCountry.filter(
    (row) => row.name.toLowerCase() === target.leagueName.toLowerCase(),
  );

  if (exactName.length === 1) {
    return {
      status: 'ok',
      providerLeagueId: String(exactName[0].id),
      picked: exactName[0],
    };
  }

  if (exactName.length > 1) {
    return {
      status: 'manual',
      reason: `${exactName.length} leagues share exact name "${target.leagueName}" — pick manually from lookup results.`,
    };
  }

  if (target.countryCode === null && byCountry.length === 1) {
    return {
      status: 'ok',
      providerLeagueId: String(byCountry[0].id),
      picked: byCountry[0],
    };
  }

  if (byCountry.length === 0) {
    return {
      status: 'missing',
      reason: 'No league rows matched expected country filter.',
    };
  }

  return {
    status: 'manual',
    reason: `${byCountry.length} candidate(s) — verify country.name/code before copying an ID.`,
  };
}

function formatTrackedLeaguesEntry(
  target: LookupTarget,
  pick: PickResult,
): { providerLeagueId: string; name: string; countryCode: string | null } {
  const providerLeagueId =
    pick.status === 'ok' ? pick.providerLeagueId : 'PILIH_MANUAL';

  return {
    providerLeagueId,
    name: target.displayName,
    countryCode: target.countryCode,
  };
}

async function main(): Promise<void> {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  console.log('Highlightly league lookup — 6 tracked competitions\n');
  console.log(
    'Review each block below. Only copy IDs you have verified against country.code / country.name.\n',
  );

  const trackedEntries: ReturnType<typeof formatTrackedLeaguesEntry>[] = [];
  let hasManualSteps = false;

  for (const target of LOOKUP_TARGETS) {
    const query = {
      leagueName: target.leagueName,
      countryCode: target.countryCode,
      ...(target.season !== undefined ? { season: target.season } : {}),
    };

    console.log(`--- ${target.displayName} ---`);
    console.log(`GET /leagues ${JSON.stringify(query)}`);

    const candidates = await fetchAllLeagueCandidates(target);
    const pick = pickProviderLeagueId(target, candidates);
    const entry = formatTrackedLeaguesEntry(target, pick);
    trackedEntries.push(entry);

    if (candidates.length === 0) {
      console.log('Results: (empty)');
    } else {
      console.log('Results:');
      for (const row of candidates) {
        console.log(`  ${JSON.stringify(summarizeRow(row))}`);
      }
    }

    if (pick.status === 'ok') {
      console.log(
        `Suggested: providerLeagueId=${pick.providerLeagueId} (${pick.picked.name}, country=${pick.picked.country?.code ?? '?'})`,
      );
    } else {
      hasManualSteps = true;
      console.log(`Suggested: ${entry.providerLeagueId} — ${pick.reason}`);
    }

    if (
      target.verifiedProviderLeagueId &&
      pick.status === 'ok' &&
      pick.providerLeagueId !== target.verifiedProviderLeagueId
    ) {
      hasManualSteps = true;
      console.log(
        `WARNING: domain-rules verified id ${target.verifiedProviderLeagueId} but picked ${pick.providerLeagueId}`,
      );
    }

    console.log('');
  }

  const constantsSnippet = [
    '// ID yang sudah TERVERIFIKASI dari lookup manual /leagues?leagueName=...&countryCode=...',
    '// JANGAN diisi angka tebakan — lihat .cursor/rules/20-domain-rules.mdc bagian "Daftar liga"',
    'export const TRACKED_LEAGUES = [',
    ...trackedEntries.map(
      (entry) =>
        `  { providerLeagueId: '${entry.providerLeagueId}', name: '${entry.name}', countryCode: ${entry.countryCode === null ? 'null' : `'${entry.countryCode}'`} },`,
    ),
    '] as const;',
  ].join('\n');

  console.log('='.repeat(72));
  console.log('Copy to lib/shared/constants.ts:\n');
  console.log(constantsSnippet);

  if (hasManualSteps) {
    console.log('\nSome entries need manual verification before updating constants.ts.');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
