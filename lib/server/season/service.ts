import { fromZonedTime } from 'date-fns-tz';

import { getQuarterBounds, type QuarterBounds } from '@/lib/server/season/quarter';
import {
  findSeasonByStartDate,
  insertSeasonIfAbsent,
  type SeasonRow,
} from '@/lib/server/season/repository';
import { APP_TIMEZONE } from '@/lib/shared/constants';

export { getQuarterBounds } from '@/lib/server/season/quarter';
export type { QuarterBounds } from '@/lib/server/season/quarter';
export type { SeasonRow } from '@/lib/server/season/repository';

/**
 * SEMENTARA (atas permintaan user): leaderboard di-scope ke SATU "season World Cup 2026"
 * tunggal, bukan per-kuartal kalender (SPEC.md 5a). Set flag ini ke `false` untuk kembali
 * ke perilaku kuartal normal — ini SATU-SATUNYA titik yang perlu diubah untuk membalikkan,
 * karena semua scope (penguncian seasonId di prediksi baru + scope leaderboard) mengalir
 * lewat getCurrentSeason(). Prediksi yang dibuat di season kuartal sebelumnya tetap terikat
 * ke seasonId lamanya (tidak dipindah/recalculate), jadi membalikkan flag ini aman.
 */
const WORLD_CUP_SEASON_OVERRIDE = true;

/**
 * Batas "season World Cup 2026" — dipakai HANYA saat WORLD_CUP_SEASON_OVERRIDE aktif.
 * Rentang sengaja dibuat longgar (1 Jun–31 Jul 2026 di APP_TIMEZONE) supaya mencakup
 * seluruh periode turnamen tanpa perlu tanggal persis. label muat di seasons.label (<=20).
 */
function getWorldCupSeasonBounds(): QuarterBounds {
  return {
    label: 'World Cup 2026',
    startDate: fromZonedTime('2026-06-01T00:00:00.000', APP_TIMEZONE),
    endDate: fromZonedTime('2026-07-31T23:59:59.999', APP_TIMEZONE),
  };
}

/**
 * Season aktif untuk `now` (default: sekarang), dihitung dari kuartal kalender di
 * APP_TIMEZONE. Lazy-create: kalau baris season untuk kuartal itu belum ada, dibuat
 * saat ini juga — TIDAK pre-populate season masa depan, TIDAK ada cron reset.
 *
 * `seasonId` yang dikembalikan stabil (sama untuk pemanggilan berikutnya di kuartal yang
 * sama) dan dipakai untuk dikunci ke prediksi baru (lihat DATABASE.md / SPEC.md 5a).
 *
 * Saat WORLD_CUP_SEASON_OVERRIDE aktif, `now` diabaikan dan selalu mengembalikan season
 * World Cup 2026 tunggal (lihat catatan flag di atas).
 */
export async function getCurrentSeason(now: Date = new Date()): Promise<SeasonRow> {
  const bounds = WORLD_CUP_SEASON_OVERRIDE
    ? getWorldCupSeasonBounds()
    : getQuarterBounds(now);

  const existing = await findSeasonByStartDate(bounds.startDate);
  if (existing) {
    return existing;
  }

  const inserted = await insertSeasonIfAbsent({
    label: bounds.label,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
  });
  if (inserted) {
    return inserted;
  }

  // Conflict: request lain membuat baris ini barusan (race) — ambil ulang.
  const afterRace = await findSeasonByStartDate(bounds.startDate);
  if (afterRace) {
    return afterRace;
  }

  throw new Error(`Gagal get-or-create season untuk ${bounds.label}`);
}
