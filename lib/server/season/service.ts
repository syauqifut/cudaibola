import { getQuarterBounds } from '@/lib/server/season/quarter';
import {
  findSeasonByStartDate,
  insertSeasonIfAbsent,
  type SeasonRow,
} from '@/lib/server/season/repository';

export { getQuarterBounds } from '@/lib/server/season/quarter';
export type { QuarterBounds } from '@/lib/server/season/quarter';
export type { SeasonRow } from '@/lib/server/season/repository';

/**
 * Season aktif untuk `now` (default: sekarang), dihitung dari kuartal kalender di
 * APP_TIMEZONE. Lazy-create: kalau baris season untuk kuartal itu belum ada, dibuat
 * saat ini juga — TIDAK pre-populate season masa depan, TIDAK ada cron reset.
 *
 * `seasonId` yang dikembalikan stabil (sama untuk pemanggilan berikutnya di kuartal yang
 * sama) dan dipakai untuk dikunci ke prediksi baru (lihat DATABASE.md / SPEC.md 5a).
 */
export async function getCurrentSeason(now: Date = new Date()): Promise<SeasonRow> {
  const bounds = getQuarterBounds(now);

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
