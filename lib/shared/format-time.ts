import { id } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { APP_TIMEZONE } from '@/lib/shared/constants';

/**
 * Rentang awal–akhir hari (di APP_TIMEZONE) yang memuat `targetDate`, dikonversi ke UTC
 * untuk query DB. Default `targetDate` = sekarang (= "hari ini").
 *
 * Range dihitung lewat string tanggal APP_TIMEZONE (bukan startOfDay/endOfDay pada hasil
 * toZonedTime) supaya hasilnya benar terlepas dari timezone runtime Node — date-fns
 * startOfDay/endOfDay membaca jam pakai timezone lokal proses, bukan APP_TIMEZONE.
 */
export function getDateRangeUtc(
  targetDate: Date = new Date(),
): { start: Date; end: Date } {
  const dateStr = getAppDateString(targetDate);
  return {
    start: fromZonedTime(`${dateStr}T00:00:00.000`, APP_TIMEZONE),
    end: fromZonedTime(`${dateStr}T23:59:59.999`, APP_TIMEZONE),
  };
}

/** Tanggal kalender "YYYY-MM-DD" di APP_TIMEZONE untuk sebuah instant. */
export function getAppDateString(date: Date = new Date()): string {
  return formatInTimeZone(date, APP_TIMEZONE, 'yyyy-MM-dd');
}

/** Validasi string tanggal "YYYY-MM-DD" (sekaligus cek tanggal valid, mis. bukan 2026-13-40). */
export function isValidAppDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = fromZonedTime(`${value}T12:00:00.000`, APP_TIMEZONE);
  return !Number.isNaN(instant.getTime()) && getAppDateString(instant) === value;
}

/** Parse "YYYY-MM-DD" (tanggal kalender APP_TIMEZONE) jadi instant di tengah hari itu. */
export function parseAppDate(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T12:00:00.000`, APP_TIMEZONE);
}

/** Apakah dua instant jatuh di tanggal kalender yang sama di APP_TIMEZONE. */
export function isSameAppDay(a: Date, b: Date): boolean {
  return getAppDateString(a) === getAppDateString(b);
}

/** Geser tanggal kalender "YYYY-MM-DD" sebanyak `deltaDays` hari (tetap di APP_TIMEZONE). */
export function shiftAppDate(dateStr: string, deltaDays: number): string {
  const noonUtc = new Date(`${dateStr}T12:00:00.000Z`);
  noonUtc.setUTCDate(noonUtc.getUTCDate() + deltaDays);
  return noonUtc.toISOString().slice(0, 10);
}

/** Label tanggal untuk nav bar — "Hari ini, 25 Jun" atau "26 Jun" (DESIGN.md). */
export function formatAppDateLabel(
  dateStr: string,
  now: Date = new Date(),
): string {
  const instant = parseAppDate(dateStr);
  const label = formatInTimeZone(instant, APP_TIMEZONE, 'd MMM', { locale: id });
  return dateStr === getAppDateString(now) ? `Hari ini, ${label}` : label;
}

/** Format jam kickoff untuk tampilan UI — 24 jam di APP_TIMEZONE. */
export function formatKickoffTime(kickoffTime: Date): string {
  return formatInTimeZone(kickoffTime, APP_TIMEZONE, 'HH:mm');
}
