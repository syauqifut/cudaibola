import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { matches, predictions } from '@/lib/db/schema';

export type PredictionRecord = {
  id: string;
  userId: string;
  matchId: string;
  seasonId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsEarned: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MatchLockRow = {
  id: string;
  status: 'scheduled' | 'live' | 'finished';
};

type DbClient = Pick<typeof db, 'select' | 'insert' | 'update'>;

export async function findMatchForUpdate(
  tx: DbClient,
  matchId: string,
): Promise<MatchLockRow | null> {
  const [row] = await tx
    .select({
      id: matches.id,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .for('update');

  return row ?? null;
}

export async function upsertPrediction(
  tx: DbClient,
  input: {
    userId: string;
    matchId: string;
    seasonId: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
  },
): Promise<PredictionRecord> {
  const now = new Date();

  const [row] = await tx
    .insert(predictions)
    .values({
      userId: input.userId,
      matchId: input.matchId,
      seasonId: input.seasonId,
      predictedHomeScore: input.predictedHomeScore,
      predictedAwayScore: input.predictedAwayScore,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      // CATATAN: seasonId sengaja TIDAK di-update di sini. Prediksi terkunci ke season
      // tempat ia dibuat (SPEC.md 5a / DATABASE.md) — edit hanya mengubah skor, bukan season.
      set: {
        predictedHomeScore: sql`excluded.predicted_home_score`,
        predictedAwayScore: sql`excluded.predicted_away_score`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning({
      id: predictions.id,
      userId: predictions.userId,
      matchId: predictions.matchId,
      seasonId: predictions.seasonId,
      predictedHomeScore: predictions.predictedHomeScore,
      predictedAwayScore: predictions.predictedAwayScore,
      pointsEarned: predictions.pointsEarned,
      createdAt: predictions.createdAt,
      updatedAt: predictions.updatedAt,
    });

  if (!row) {
    throw new Error('Failed to upsert prediction');
  }

  return row;
}

export async function findPredictionByUserAndMatch(
  userId: string,
  matchId: string,
): Promise<PredictionRecord | null> {
  const [row] = await db
    .select({
      id: predictions.id,
      userId: predictions.userId,
      matchId: predictions.matchId,
      seasonId: predictions.seasonId,
      predictedHomeScore: predictions.predictedHomeScore,
      predictedAwayScore: predictions.predictedAwayScore,
      pointsEarned: predictions.pointsEarned,
      createdAt: predictions.createdAt,
      updatedAt: predictions.updatedAt,
    })
    .from(predictions)
    .where(
      and(eq(predictions.userId, userId), eq(predictions.matchId, matchId)),
    )
    .limit(1);

  return row ?? null;
}

export type MatchForScoring = {
  id: string;
  status: 'scheduled' | 'live' | 'finished';
  homeScore: number | null;
  awayScore: number | null;
};

export async function findMatchForScoring(
  tx: DbClient,
  matchId: string,
): Promise<MatchForScoring | null> {
  const [row] = await tx
    .select({
      id: matches.id,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .for('update');

  return row ?? null;
}

export async function findPredictionsByMatchId(
  tx: DbClient,
  matchId: string,
): Promise<
  Pick<
    PredictionRecord,
    'id' | 'predictedHomeScore' | 'predictedAwayScore'
  >[]
> {
  return tx
    .select({
      id: predictions.id,
      predictedHomeScore: predictions.predictedHomeScore,
      predictedAwayScore: predictions.predictedAwayScore,
    })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));
}

export async function overwritePredictionPoints(
  tx: DbClient,
  predictionId: string,
  pointsEarned: number,
): Promise<void> {
  await tx
    .update(predictions)
    .set({
      pointsEarned,
      updatedAt: new Date(),
    })
    .where(eq(predictions.id, predictionId));
}
