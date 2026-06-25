import { pgTable, uuid, varchar, integer, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// ============================================================
// USERS
// Bukan akun ber-auth — hanya identitas ringan yang dibuat client
// (userId di-generate & disimpan di localStorage browser, lihat SPEC.md bagian 3)
// ============================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: varchar('nickname', { length: 32 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// COMPETITIONS
// Master data kompetisi, dipakai untuk grouping & urutan tampil di homepage
// ============================================================

export const competitions = pgTable('competitions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // id dari provider eksternal (football-data.org), dipakai saat sync, bukan dipakai di UI
  providerCompetitionId: varchar('provider_competition_id', { length: 64 }).notNull().unique(),

  name: varchar('name', { length: 120 }).notNull(),      // "FIFA World Cup", "Premier League"
  shortName: varchar('short_name', { length: 40 }),       // "World Cup", "EPL" (opsional, buat UI ringkas)
  logoUrl: varchar('logo_url', { length: 255 }),

  // Urutan tampil di homepage — angka lebih kecil tampil lebih atas (World Cup = 1, dst)
  priorityOrder: integer('priority_order').notNull().default(100),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// MATCHES
// Hasil sinkronisasi dari provider eksternal. Semua baca data match
// di app HARUS dari tabel ini, tidak pernah langsung ke provider.
// ============================================================

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),

  providerMatchId: varchar('provider_match_id', { length: 64 }).notNull().unique(),
  competitionId: uuid('competition_id').notNull().references(() => competitions.id),

  // Label babak/round untuk ditampilkan di header grup, misal "Grup A", "Pekan 38", "Perempat final"
  roundName: varchar('round_name', { length: 80 }),

  homeTeamName: varchar('home_team_name', { length: 80 }).notNull(),
  awayTeamName: varchar('away_team_name', { length: 80 }).notNull(),
  homeTeamLogoUrl: varchar('home_team_logo_url', { length: 255 }),
  awayTeamLogoUrl: varchar('away_team_logo_url', { length: 255 }),

  // Skor live/final. NULL selama status masih 'scheduled'.
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),

  status: matchStatusEnum('status').notNull().default('scheduled'),

  // Menit berjalan, hanya relevan saat status = 'live'. NULL di status lain.
  minute: integer('minute'),

  kickoffTime: timestamp('kickoff_time').notNull(),

  // Kapan baris ini terakhir di-refresh oleh cron sync — buat tau data basi atau belum
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// PREDICTIONS
// Satu baris = satu tebakan skor oleh satu user untuk satu match.
// Lock time (tidak bisa submit/edit setelah kickoff) divalidasi di
// service layer, BUKAN constraint di level DB.
// ============================================================

export const predictions = pgTable('predictions', {
  id: uuid('id').primaryKey().defaultRandom(),

  userId: uuid('user_id').notNull().references(() => users.id),
  matchId: uuid('match_id').notNull().references(() => matches.id),

  predictedHomeScore: integer('predicted_home_score').notNull(),
  predictedAwayScore: integer('predicted_away_score').notNull(),

  // Diisi oleh job scoring setelah match status = 'finished'. NULL sebelum dihitung.
  // Nilai hanya 0, 1, atau 3 sesuai SPEC.md bagian 4 — tidak pernah negatif.
  pointsEarned: integer('points_earned'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Satu user hanya boleh punya satu prediksi aktif per match
  oneUserOneMatch: unique().on(table.userId, table.matchId),
}));
