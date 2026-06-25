import { endOfDay, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

import { APP_TIMEZONE } from '@/lib/shared/constants';

/** Rentang awal–akhir "hari ini" di APP_TIMEZONE, dikonversi ke UTC untuk query DB. */
export function getTodayRangeUtc(now: Date = new Date()): { start: Date; end: Date } {
  const zonedNow = toZonedTime(now, APP_TIMEZONE);
  return {
    start: fromZonedTime(startOfDay(zonedNow), APP_TIMEZONE),
    end: fromZonedTime(endOfDay(zonedNow), APP_TIMEZONE),
  };
}

/** Format jam kickoff untuk tampilan UI — 24 jam di APP_TIMEZONE. */
export function formatKickoffTime(kickoffTime: Date): string {
  return formatInTimeZone(kickoffTime, APP_TIMEZONE, 'HH:mm');
}
