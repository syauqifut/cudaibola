import 'dotenv/config';

import cron from 'node-cron';

import {
  hasMatchesInRange,
  syncLiveScores,
  syncUpcomingFixtures,
} from '@/lib/server/sync/service';

const BOOTSTRAP_WINDOW_DAYS = 35; // 5 minggu ke depan

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Saat startup: kalau tidak ada jadwal match dalam 5 minggu ke depan (tabel kosong di first
 * deploy, atau data sudah basi setelah lama down), tarik jadwal awal sekali via
 * syncUpcomingFixtures(). Restart normal dengan data masih ada → skip.
 */
async function bootstrapIfNeeded(): Promise<void> {
  const now = new Date();
  const hasUpcoming = await hasMatchesInRange(now, addDays(now, BOOTSTRAP_WINDOW_DAYS));

  if (hasUpcoming) {
    console.log('[sync-worker] Jadwal 5 minggu ke depan sudah ada, lewati bootstrap.');
    return;
  }

  console.log('[sync-worker] Tidak ada jadwal 5 minggu ke depan, menjalankan bootstrap...');
  const result = await syncUpcomingFixtures();
  console.log('[sync-worker] Bootstrap selesai:', result);
}

async function main(): Promise<void> {
  try {
    await bootstrapIfNeeded();
  } catch (error) {
    // Bootstrap gagal tidak boleh mematikan worker — cron tetap didaftarkan, tick berikutnya
    // (atau sync mingguan) akan mengisi data begitu provider/DB pulih.
    console.error('[sync-worker] Bootstrap gagal:', error);
  }

  // WAJIB tiap menit, tanpa cek ada/tidaknya match live / throttle idle. Overlap dicegah oleh advisory
  // lock di syncLiveScores() (kalau eksekusi sebelumnya masih jalan → skip otomatis).
  cron.schedule('* * * * *', async () => {
    try {
      const result = await syncLiveScores();
      if (!result.skipped) {
        console.log('[sync-worker]', new Date().toISOString(), 'syncLiveScores', result);
      }
    } catch (error) {
      console.error('[sync-worker] syncLiveScores error:', error);
    }
  });

  // Jadwal mingguan: Senin 03:00. Catatan: node-cron pakai timezone SERVER (VPS). Kalau VPS
  // tidak di WIB dan ingin tepat 03:00 WIB, set timezone eksplisit:
  //   cron.schedule('0 3 * * 1', fn, { timezone: 'Asia/Jakarta' })
  cron.schedule('0 3 * * 1', async () => {
    try {
      const result = await syncUpcomingFixtures();
      if (!result.skipped) {
        console.log('[sync-worker]', new Date().toISOString(), 'syncUpcomingFixtures', result);
      }
    } catch (error) {
      console.error('[sync-worker] syncUpcomingFixtures error:', error);
    }
  });

  console.log('[sync-worker] Scheduler started (live: tiap menit, fixtures: Senin 03:00).');
}

void main();
