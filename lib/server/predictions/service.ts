import { db } from '@/lib/db/client';
import { isValidUserId } from '@/lib/server/identity/session';
import {
  findMatchForScoring,
  findMatchForUpdate,
  findPredictionByUserAndMatch,
  findPredictionsByMatchId,
  overwritePredictionPoints,
  upsertPrediction,
  type PredictionRecord,
} from '@/lib/server/predictions/repository';
import { calculatePoints } from '@/lib/server/predictions/scoring';

const SCORE_MIN = 0;
const SCORE_MAX = 20;

export class PredictionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PredictionValidationError';
  }
}

export type SubmitPredictionInput = {
  userId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
};

function isValidUuid(value: string): boolean {
  return isValidUserId(value);
}

function validateScore(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new PredictionValidationError(
      `${label} harus berupa angka bulat 0 sampai 20.`,
    );
  }

  if (value < SCORE_MIN || value > SCORE_MAX) {
    throw new PredictionValidationError(
      'Skor harus berupa angka 0 sampai 20.',
    );
  }

  return value;
}

function validateSubmitInput(input: SubmitPredictionInput): SubmitPredictionInput {
  if (!isValidUuid(input.userId)) {
    throw new PredictionValidationError('userId tidak valid.');
  }

  if (!isValidUuid(input.matchId)) {
    throw new PredictionValidationError('matchId tidak valid.');
  }

  return {
    userId: input.userId,
    matchId: input.matchId,
    predictedHomeScore: validateScore(
      input.predictedHomeScore,
      'Skor tim tuan rumah',
    ),
    predictedAwayScore: validateScore(
      input.predictedAwayScore,
      'Skor tim tamu',
    ),
  };
}

export async function submitPrediction(
  rawInput: SubmitPredictionInput,
): Promise<PredictionRecord> {
  const input = validateSubmitInput(rawInput);

  return db.transaction(async (tx) => {
    const match = await findMatchForUpdate(tx, input.matchId);

    if (!match) {
      throw new PredictionValidationError('Pertandingan tidak ditemukan.');
    }

    if (match.status !== 'scheduled') {
      throw new PredictionValidationError(
        'Pertandingan sudah dimulai, tebakan tidak bisa lagi diubah.',
      );
    }

    return upsertPrediction(tx, input);
  });
}

export async function getPredictionForUser(
  userId: string,
  matchId: string,
): Promise<PredictionRecord | null> {
  if (!isValidUuid(userId) || !isValidUuid(matchId)) {
    throw new PredictionValidationError('userId atau matchId tidak valid.');
  }

  return findPredictionByUserAndMatch(userId, matchId);
}

/** Idempotent — overwrite pointsEarned untuk semua prediksi match ini. */
export async function calculateAndSavePointsForMatch(
  matchId: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const match = await findMatchForScoring(tx, matchId);

    if (!match || match.status !== 'finished') {
      return 0;
    }

    if (match.homeScore === null || match.awayScore === null) {
      console.warn(
        `[predictions] Skip scoring for match ${matchId}: final score not available`,
      );
      return 0;
    }

    const actual = { home: match.homeScore, away: match.awayScore };
    const matchPredictions = await findPredictionsByMatchId(tx, matchId);

    for (const prediction of matchPredictions) {
      const points = calculatePoints(
        {
          home: prediction.predictedHomeScore,
          away: prediction.predictedAwayScore,
        },
        actual,
      );
      await overwritePredictionPoints(tx, prediction.id, points);
    }

    return matchPredictions.length;
  });
}
