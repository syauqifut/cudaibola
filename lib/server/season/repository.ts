import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { seasons } from '@/lib/db/schema';

export type SeasonRow = typeof seasons.$inferSelect;

export type NewSeasonInput = {
  label: string;
  startDate: Date;
  endDate: Date;
};

export async function findSeasonByStartDate(
  startDate: Date,
): Promise<SeasonRow | null> {
  const [row] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.startDate, startDate))
    .limit(1);

  return row ?? null;
}

/**
 * Insert season baru. Kalau sudah ada baris dengan label yang sama (race lazy-create dari
 * request lain), kembalikan null tanpa error — caller harus re-select by startDate.
 */
export async function insertSeasonIfAbsent(
  input: NewSeasonInput,
): Promise<SeasonRow | null> {
  const [row] = await db
    .insert(seasons)
    .values({
      label: input.label,
      startDate: input.startDate,
      endDate: input.endDate,
    })
    .onConflictDoNothing({ target: seasons.label })
    .returning();

  return row ?? null;
}
