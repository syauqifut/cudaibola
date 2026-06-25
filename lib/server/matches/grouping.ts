import type {
  CompetitionMatchGroup,
  MatchWithCompetition,
} from '@/lib/shared/types';

function sortMatchesWithinGroup(
  groupMatches: MatchWithCompetition[],
): MatchWithCompetition[] {
  return [...groupMatches].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return a.kickoffTime.getTime() - b.kickoffTime.getTime();
  });
}

export function groupMatchesByCompetition(
  matchList: MatchWithCompetition[],
  isToday: boolean,
): CompetitionMatchGroup[] {
  const byCompetition = new Map<string, MatchWithCompetition[]>();

  for (const match of matchList) {
    const existing = byCompetition.get(match.competitionId) ?? [];
    existing.push(match);
    byCompetition.set(match.competitionId, existing);
  }

  const groups: CompetitionMatchGroup[] = [];

  for (const [, compMatches] of byCompetition) {
    const sortedMatches = sortMatchesWithinGroup(compMatches);
    const first = sortedMatches[0];

    groups.push({
      competitionId: first.competitionId,
      competitionName: first.competitionName,
      competitionShortName: first.competitionShortName,
      competitionLogoUrl: first.competitionLogoUrl,
      priorityOrder: first.competitionPriorityOrder,
      roundName: first.roundName,
      hasLiveMatch: sortedMatches.some((m) => m.status === 'live'),
      matches: sortedMatches,
    });
  }

  groups.sort((a, b) => {
    // Live-pinning grup HANYA saat menampilkan hari ini (SPEC.md 5b / DESIGN.md).
    // Saat navigasi ke tanggal lain, urutan grup murni berdasar priorityOrder.
    if (isToday) {
      if (a.hasLiveMatch && !b.hasLiveMatch) return -1;
      if (!a.hasLiveMatch && b.hasLiveMatch) return 1;
    }
    return a.priorityOrder - b.priorityOrder;
  });

  return groups;
}
