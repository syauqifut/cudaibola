import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

import { APP_TIMEZONE } from '@/lib/shared/constants';

/**
 * Batas satu season = satu kuartal kalender (Jan-Mar, Apr-Jun, Jul-Sep, Okt-Des) di
 * APP_TIMEZONE. `startDate`/`endDate` adalah instant UTC hasil konversi dari wall-clock
 * APP_TIMEZONE, siap disimpan/dibandingkan di DB. `label` di-derive dari `startDate`.
 *
 * SATU-SATUNYA sumber logika kuartal — jangan duplikat perhitungan kuartal di file lain
 * (lihat .cursor/rules/20-domain-rules.mdc bagian Season).
 */
export type QuarterBounds = {
  /** Contoh: "2026 Q3" */
  label: string;
  /** Awal kuartal, 00:00:00.000 APP_TIMEZONE, sebagai instant UTC. */
  startDate: Date;
  /** Akhir kuartal, 23:59:59.999 APP_TIMEZONE, sebagai instant UTC. */
  endDate: Date;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Jumlah hari dalam bulan (tz-independent). month: 0-11. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function getQuarterBounds(date: Date = new Date()): QuarterBounds {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  const year = zoned.getFullYear();
  const month = zoned.getMonth(); // 0-11 (di APP_TIMEZONE)

  const quarter = Math.floor(month / 3) + 1; // 1-4
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
  const endMonth = startMonth + 2; // 2, 5, 8, 11
  const endDay = daysInMonth(year, endMonth);

  // Bangun wall-clock APP_TIMEZONE lalu konversi ke instant UTC.
  const startLocal = `${year}-${pad2(startMonth + 1)}-01T00:00:00.000`;
  const endLocal = `${year}-${pad2(endMonth + 1)}-${pad2(endDay)}T23:59:59.999`;

  const startDate = fromZonedTime(startLocal, APP_TIMEZONE);
  const endDate = fromZonedTime(endLocal, APP_TIMEZONE);

  // Label di-derive dari startDate (bukan dari `date` mentah) supaya konsisten dengan
  // tahun/kuartal yang benar-benar tersimpan.
  const label = `${formatInTimeZone(startDate, APP_TIMEZONE, 'yyyy')} Q${quarter}`;

  return { label, startDate, endDate };
}
