import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { competitions, matches } from '@/lib/db/schema';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type UpsertCompetitionInput = {
  providerCompetitionId: string;
  name: string;
  logoUrl?: string | null;
  priorityOrder?: number;
};

export type UpsertMatchInput = {
  providerMatchId: string;
  competitionId: string;
  roundName?: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogoUrl?: string | null;
  awayTeamLogoUrl?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute: number | null;
  kickoffTime: Date;
  lastSyncedAt: Date;
};

type DbClient = Pick<typeof db, 'insert'>;

export async function tryAcquireSyncLock(lockKey: number): Promise<boolean> {
  const result = await db.execute<{ acquired: boolean }>(
    sql`SELECT pg_try_advisory_lock(${lockKey}) AS acquired`,
  );
  return result[0]?.acquired === true;
}

export async function releaseSyncLock(lockKey: number): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_unlock(${lockKey})`);
}

export async function findMatchStatusByProviderMatchId(
  providerMatchId: string,
): Promise<MatchStatus | null> {
  const [row] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.providerMatchId, providerMatchId))
    .limit(1);

  return row?.status ?? null;
}

async function upsertCompetitionWithClient(
  client: DbClient,
  input: UpsertCompetitionInput,
): Promise<string> {
  const [row] = await client
    .insert(competitions)
    .values({
      providerCompetitionId: input.providerCompetitionId,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      priorityOrder: input.priorityOrder ?? 100,
    })
    .onConflictDoUpdate({
      target: competitions.providerCompetitionId,
      set: {
        name: sql`excluded.name`,
        logoUrl: sql`excluded.logo_url`,
      },
    })
    .returning({ id: competitions.id });

  if (!row) {
    throw new Error(
      `Failed to upsert competition ${input.providerCompetitionId}`,
    );
  }

  return row.id;
}

async function upsertMatchWithClient(
  client: DbClient,
  input: UpsertMatchInput,
): Promise<string> {
  const [row] = await client
    .insert(matches)
    .values({
      providerMatchId: input.providerMatchId,
      competitionId: input.competitionId,
      roundName: input.roundName ?? null,
      homeTeamName: input.homeTeamName,
      awayTeamName: input.awayTeamName,
      homeTeamLogoUrl: input.homeTeamLogoUrl ?? null,
      awayTeamLogoUrl: input.awayTeamLogoUrl ?? null,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      status: input.status,
      minute: input.minute,
      kickoffTime: input.kickoffTime,
      lastSyncedAt: input.lastSyncedAt,
    })
    .onConflictDoUpdate({
      target: matches.providerMatchId,
      set: {
        competitionId: sql`excluded.competition_id`,
        roundName: sql`excluded.round_name`,
        homeTeamName: sql`excluded.home_team_name`,
        awayTeamName: sql`excluded.away_team_name`,
        homeTeamLogoUrl: sql`excluded.home_team_logo_url`,
        awayTeamLogoUrl: sql`excluded.away_team_logo_url`,
        homeScore: sql`excluded.home_score`,
        awayScore: sql`excluded.away_score`,
        status: sql`excluded.status`,
        minute: sql`excluded.minute`,
        kickoffTime: sql`excluded.kickoff_time`,
        lastSyncedAt: sql`excluded.last_synced_at`,
      },
    })
    .returning({ id: matches.id });

  if (!row) {
    throw new Error(`Failed to upsert match ${input.providerMatchId}`);
  }

  return row.id;
}

export async function upsertCompetition(
  input: UpsertCompetitionInput,
): Promise<string> {
  return upsertCompetitionWithClient(db, input);
}

export async function upsertMatch(input: UpsertMatchInput): Promise<string> {
  return upsertMatchWithClient(db, input);
}

export type UpsertMatchWithoutCompetitionInput = Omit<
  UpsertMatchInput,
  'competitionId'
>;

/** Upsert competition + match dalam satu transaction, berdasarkan provider ID. */
export async function upsertCompetitionAndMatch(
  competitionInput: UpsertCompetitionInput,
  matchInput: UpsertMatchWithoutCompetitionInput,
): Promise<{ competitionId: string; matchId: string }> {
  return db.transaction(async (tx) => {
    const competitionId = await upsertCompetitionWithClient(tx, competitionInput);
    const matchId = await upsertMatchWithClient(tx, {
      ...matchInput,
      competitionId,
    });
    return { competitionId, matchId };
  });
}
