import { getTodayMatches } from '@/lib/server/matches/service';

export async function GET() {
  try {
    const groups = await getTodayMatches();
    return Response.json({ groups });
  } catch (error) {
    console.error('[api/matches]', error);
    return Response.json(
      { error: 'Gagal memuat data pertandingan.' },
      { status: 500 },
    );
  }
}
