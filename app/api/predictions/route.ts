import {
  getPredictionForUser,
  PredictionValidationError,
  submitPrediction,
} from '@/lib/server/predictions/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const matchId = searchParams.get('matchId');

  if (!userId || !matchId) {
    return Response.json(
      { error: 'userId dan matchId wajib diisi.' },
      { status: 400 },
    );
  }

  try {
    const prediction = await getPredictionForUser(userId, matchId);

    if (!prediction) {
      return Response.json({ prediction: null });
    }

    return Response.json({
      prediction: {
        id: prediction.id,
        predictedHomeScore: prediction.predictedHomeScore,
        predictedAwayScore: prediction.predictedAwayScore,
        pointsEarned: prediction.pointsEarned,
      },
    });
  } catch (error) {
    if (error instanceof PredictionValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error('[api/predictions GET]', error);
    return Response.json({ error: 'Gagal memuat prediksi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Format request tidak valid.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Format request tidak valid.' }, { status: 400 });
  }

  const {
    userId,
    matchId,
    predictedHomeScore,
    predictedAwayScore,
  } = body as Record<string, unknown>;

  if (
    typeof userId !== 'string' ||
    typeof matchId !== 'string' ||
    typeof predictedHomeScore !== 'number' ||
    typeof predictedAwayScore !== 'number'
  ) {
    return Response.json(
      { error: 'userId, matchId, dan skor prediksi wajib diisi.' },
      { status: 400 },
    );
  }

  try {
    const prediction = await submitPrediction({
      userId,
      matchId,
      predictedHomeScore,
      predictedAwayScore,
    });

    return Response.json({
      id: prediction.id,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
      pointsEarned: prediction.pointsEarned,
    });
  } catch (error) {
    if (error instanceof PredictionValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error('[api/predictions POST]', error);
    return Response.json(
      { error: 'Gagal menyimpan tebakan. Coba lagi.' },
      { status: 500 },
    );
  }
}
