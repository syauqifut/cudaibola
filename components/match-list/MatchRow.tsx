'use client';

import { LiveBadge } from '@/components/match-list/LiveBadge';
import { MatchStatusBadge } from '@/components/match-list/MatchStatusBadge';
import { formatKickoffTime } from '@/lib/shared/format-time';
import type { MatchWithCompetition } from '@/lib/shared/types';

type MatchRowProps = {
  match: MatchWithCompetition;
  isLast: boolean;
  pointsEarned?: number | null;
  onSelect?: (matchId: string) => void;
};

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '– : –';
  return `${home} : ${away}`;
}

function MatchCenter({ match }: { match: MatchWithCompetition }) {
  const kickoff = new Date(match.kickoffTime);

  if (match.status === 'scheduled') {
    return (
      <span className="font-mono text-lg tabular-nums">
        {formatKickoffTime(kickoff)}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-xl tabular-nums">
        {formatScore(match.homeScore, match.awayScore)}
      </span>
      {match.status === 'live' && match.minute != null && (
        <LiveBadge minute={match.minute} />
      )}
    </div>
  );
}

export function MatchRow({ match, isLast, pointsEarned, onSelect }: MatchRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(match.id)}
      className={`match-row-brutal flex w-full items-center gap-3 px-4 py-4 text-left ${
        isLast ? '' : 'border-b-[3px] border-ink'
      }`}
    >
      <span className="min-w-0 flex-1 truncate font-sans">{match.homeTeamName}</span>

      <div className="shrink-0 px-2">
        <MatchCenter match={match} />
      </div>

      <span className="min-w-0 flex-1 truncate text-right font-sans">
        {match.awayTeamName}
      </span>

      <MatchStatusBadge status={match.status} pointsEarned={pointsEarned} />
    </button>
  );
}
