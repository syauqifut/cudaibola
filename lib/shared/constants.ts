export const APP_TIMEZONE = 'Asia/Jakarta';

/** Key localStorage untuk identitas user (userId + nickname). */
export const IDENTITY_STORAGE_KEY = 'cudaibola-identity';

// Placeholder nama tim untuk fixture knockout yang lawannya belum ditentukan (TBD). Provider
// (football-data.org) mengirim `team.name = null` untuk slot yang belum diisi; kolom
// matches.home_team_name / away_team_name NOT NULL, jadi kita simpan label ini sebagai gantinya.
// Prediksi untuk match ber-tim TBD dikunci sampai kedua tim jelas (bukan status kickoff).
export const TBD_TEAM_NAME = 'TBD';

/** Apakah nama tim adalah placeholder TBD (lawan belum ditentukan)? */
export function isTbdTeamName(name: string | null | undefined): boolean {
  return name == null || name.trim() === '' || name === TBD_TEAM_NAME;
}

/** Apakah salah satu tim di match ini masih TBD (lawan belum ditentukan)? */
export function matchHasTbdTeam(match: {
  homeTeamName: string;
  awayTeamName: string;
}): boolean {
  return isTbdTeamName(match.homeTeamName) || isTbdTeamName(match.awayTeamName);
}

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
