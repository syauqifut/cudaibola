import 'dotenv/config';

import cron from 'node-cron';

import { hasLiveMatchToday } from '@/lib/server/matches/service';
import { syncMatchesFromProvider } from '@/lib/server/sync/service';

cron.schedule('* * * * *', async () => {
  try {
    const frequent = await hasLiveMatchToday();
    const result = await syncMatchesFromProvider({ frequent });

    if (!result.skipped) {
      console.log('[sync-worker]', new Date().toISOString(), result);
    }
  } catch (error) {
    console.error('[sync-worker]', error);
  }
});

console.log('[sync-worker] Scheduler started (every minute)');
