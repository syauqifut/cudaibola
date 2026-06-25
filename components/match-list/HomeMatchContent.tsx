'use client';

import { useCallback, useState } from 'react';

import { EmptyState } from '@/components/match-list/EmptyState';
import { MatchListWithDetail } from '@/components/match-list/MatchListWithDetail';
import { toUserMessage } from '@/lib/shared/user-error';
import type { CompetitionMatchGroup } from '@/lib/shared/types';

type HomeMatchContentProps = {
  initialGroups: CompetitionMatchGroup[];
};

export function HomeMatchContent({ initialGroups }: HomeMatchContentProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [isReloading, setIsReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadMatches = useCallback(async () => {
    setIsReloading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/matches');
      const data = (await response.json()) as {
        groups?: CompetitionMatchGroup[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Gagal memuat data pertandingan.');
      }

      setGroups(data.groups ?? []);
    } catch (error) {
      setLoadError(
        toUserMessage(error, 'Gagal memuat data pertandingan. Coba lagi.'),
      );
    } finally {
      setIsReloading(false);
    }
  }, []);

  if (groups.length === 0) {
    return (
      <EmptyState
        onReload={() => void reloadMatches()}
        isReloading={isReloading}
        error={loadError}
      />
    );
  }

  return <MatchListWithDetail groups={groups} />;
}
