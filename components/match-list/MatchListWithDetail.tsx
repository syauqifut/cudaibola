'use client';

import { useMemo, useState } from 'react';

import { MatchDetailPopup } from '@/components/prediction/MatchDetailPopup';
import { MatchList } from '@/components/match-list/MatchList';
import type {
  CompetitionMatchGroup,
  MatchWithCompetition,
} from '@/lib/shared/types';

type MatchListWithDetailProps = {
  groups: CompetitionMatchGroup[];
};

export function MatchListWithDetail({ groups }: MatchListWithDetailProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const selectedMatch = useMemo((): MatchWithCompetition | null => {
    if (!selectedMatchId) return null;

    for (const group of groups) {
      const match = group.matches.find((item) => item.id === selectedMatchId);
      if (match) return match;
    }

    return null;
  }, [groups, selectedMatchId]);

  return (
    <>
      <MatchList groups={groups} onSelectMatch={setSelectedMatchId} />

      {selectedMatch && (
        <MatchDetailPopup
          match={selectedMatch}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </>
  );
}
