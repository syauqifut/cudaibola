import { getLeaderboard } from '@/lib/server/leaderboard/service';

export async function GET() {
  try {
    const entries = await getLeaderboard();
    return Response.json({ entries });
  } catch (error) {
    console.error('[api/leaderboard]', error);
    return Response.json(
      { error: 'Gagal memuat klasemen.' },
      { status: 500 },
    );
  }
}
