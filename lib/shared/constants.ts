export const APP_TIMEZONE = 'Asia/Jakarta';

/** Key localStorage untuk identitas user (userId + nickname). */
export const IDENTITY_STORAGE_KEY = 'cudaibola-identity';

// ID dari lookup manual /leagues?leagueName=...&countryCode=... — jangan ditebak.
// Verifikasi via: npx tsx scripts/lookup-league-ids.ts
export const TRACKED_LEAGUES = [
  {
    providerLeagueId: '1635',
    name: 'FIFA World Cup 2026',
    countryCode: null,
    priorityOrder: 1,
    season: 2026,
  },
  {
    providerLeagueId: '33973',
    name: 'Premier League',
    countryCode: 'GB-ENG',
    priorityOrder: 2,
  },
  {
    providerLeagueId: '119924',
    name: 'La Liga',
    countryCode: 'ES',
    priorityOrder: 3,
  },
  {
    providerLeagueId: '67162',
    name: 'Bundesliga',
    countryCode: 'DE',
    priorityOrder: 4,
  },
  {
    providerLeagueId: '115669',
    name: 'Serie A',
    countryCode: 'IT',
    priorityOrder: 5,
  },
  {
    providerLeagueId: '52695',
    name: 'Ligue 1',
    countryCode: 'FR',
    priorityOrder: 6,
  },
] as const;
