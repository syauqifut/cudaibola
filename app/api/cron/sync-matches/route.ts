import { syncMatchesFromProvider } from '@/lib/server/sync/service';

/**
 * Cron endpoint: sync match data dari Highlightly ke database.
 *
 * Test lokal (dev server harus jalan: npm run dev):
 *
 *   curl -X GET http://localhost:3000/api/cron/sync-matches \
 *     -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2-)"
 *
 * Atau ganti secret secara eksplisit:
 *
 *   curl -X GET http://localhost:3000/api/cron/sync-matches \
 *     -H "Authorization: Bearer your-cron-secret"
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncMatchesFromProvider();
    return Response.json(result);
  } catch (error) {
    console.error('[cron/sync-matches]', error);
    return Response.json({ error: 'Sync gagal.' }, { status: 500 });
  }
}
