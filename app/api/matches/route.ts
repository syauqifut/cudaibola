import { getMatchesForDate } from '@/lib/server/matches/service';
import {
  getAppDateString,
  isValidAppDateString,
  parseAppDate,
} from '@/lib/shared/format-time';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (dateParam !== null && !isValidAppDateString(dateParam)) {
      return Response.json(
        { error: 'Format tanggal tidak valid. Pakai YYYY-MM-DD.' },
        { status: 400 },
      );
    }

    // Default: hari ini di APP_TIMEZONE (WIB).
    const dateStr = dateParam ?? getAppDateString();
    const groups = await getMatchesForDate(parseAppDate(dateStr));

    return Response.json({ date: dateStr, groups });
  } catch (error) {
    console.error('[api/matches]', error);
    return Response.json(
      { error: 'Gagal memuat data pertandingan.' },
      { status: 500 },
    );
  }
}
