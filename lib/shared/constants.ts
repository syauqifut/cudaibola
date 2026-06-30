export const APP_TIMEZONE = 'Asia/Jakarta';

/** Key localStorage untuk identitas user (userId + nickname). */
export const IDENTITY_STORAGE_KEY = 'cudaibola-identity';

// Competition codes football-data.org v4 — string code stabil & terdokumentasi resmi,
// tidak perlu lookup script / ID numerik (lihat .cursor/rules/20-domain-rules.mdc "Daftar liga").
// Daftar tertutup 7 kompetisi (SPEC.md bagian 1/1a) — jangan tambah tanpa konfirmasi user.
// `priorityOrder` menentukan urutan grup kompetisi di homepage.
export const TRACKED_COMPETITIONS = [
  { code: 'WC', name: 'FIFA World Cup', priorityOrder: 1 },
  { code: 'CL', name: 'UEFA Champions League', priorityOrder: 2 },
  { code: 'PL', name: 'Premier League', priorityOrder: 3 },
  { code: 'PD', name: 'La Liga', priorityOrder: 4 },
  { code: 'BL1', name: 'Bundesliga', priorityOrder: 5 },
  { code: 'SA', name: 'Serie A', priorityOrder: 6 },
  { code: 'FL1', name: 'Ligue 1', priorityOrder: 7 },
] as const;

export type TrackedCompetition = (typeof TRACKED_COMPETITIONS)[number];
