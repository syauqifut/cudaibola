'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DateNavBar } from '@/components/match-list/DateNavBar';
import { EmptyState } from '@/components/match-list/EmptyState';
import { MatchListWithDetail } from '@/components/match-list/MatchListWithDetail';
import {
  formatAppDateLabel,
  getAppDateString,
  shiftAppDate,
} from '@/lib/shared/format-time';
import { toUserMessage } from '@/lib/shared/user-error';
import type { CompetitionMatchGroup } from '@/lib/shared/types';

type HomeMatchContentProps = {
  initialGroups: CompetitionMatchGroup[];
};

export function HomeMatchContent({ initialGroups }: HomeMatchContentProps) {
  // initialGroups dari server = data "hari ini".
  const today = useMemo(() => getAppDateString(), []);
  const [dateStr, setDateStr] = useState(today);
  const [groups, setGroups] = useState(initialGroups);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Hindari fetch ganda untuk render pertama (data hari ini sudah dari server),
  // dan abaikan response yang sudah basi kalau user cepat menggeser tanggal.
  const isFirstRender = useRef(true);
  const latestDateRef = useRef(dateStr);

  const loadForDate = useCallback(async (target: string) => {
    latestDateRef.current = target;
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/matches?date=${target}`);
      const data = (await response.json()) as {
        groups?: CompetitionMatchGroup[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Gagal memuat data pertandingan.');
      }

      if (latestDateRef.current === target) {
        setGroups(data.groups ?? []);
      }
    } catch (error) {
      if (latestDateRef.current === target) {
        setLoadError(
          toUserMessage(error, 'Gagal memuat data pertandingan. Coba lagi.'),
        );
        setGroups([]);
      }
    } finally {
      if (latestDateRef.current === target) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void loadForDate(dateStr);
  }, [dateStr, loadForDate]);

  const goPrev = useCallback(() => {
    setDateStr((current) => shiftAppDate(current, -1));
  }, []);

  const goNext = useCallback(() => {
    setDateStr((current) => shiftAppDate(current, 1));
  }, []);

  return (
    <>
      <DateNavBar
        label={formatAppDateLabel(dateStr)}
        onPrev={goPrev}
        onNext={goNext}
        disabled={isLoading}
      />

      {isLoading && (
        <p className="px-4 py-10 text-center font-sans text-sm text-ink/60">
          Memuat pertandingan...
        </p>
      )}

      {!isLoading && (loadError || groups.length === 0) && (
        <EmptyState
          onReload={() => void loadForDate(dateStr)}
          isReloading={isLoading}
          error={loadError}
        />
      )}

      {!isLoading && !loadError && groups.length > 0 && (
        <MatchListWithDetail groups={groups} />
      )}
    </>
  );
}
