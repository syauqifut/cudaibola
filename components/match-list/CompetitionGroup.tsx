import { MatchRow } from '@/components/match-list/MatchRow';
import type { CompetitionMatchGroup } from '@/lib/shared/types';

type CompetitionGroupProps = {
  group: CompetitionMatchGroup;
  onSelectMatch?: (matchId: string) => void;
};

export function CompetitionGroup({ group, onSelectMatch }: CompetitionGroupProps) {
  const displayName = group.competitionShortName ?? group.competitionName;

  return (
    <section className="border-[3px] border-ink bg-surface shadow-brutal">
      <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-ink px-4 py-3">
        <span className="bg-ink px-2.5 py-1 font-mono text-xs uppercase text-pitch-green">
          {displayName}
        </span>
        {group.roundName && (
          <span className="font-sans text-sm text-ink/80">{group.roundName}</span>
        )}
      </div>

      <div>
        {group.matches.map((match, index) => (
          <MatchRow
            key={match.id}
            match={match}
            isLast={index === group.matches.length - 1}
            onSelect={onSelectMatch}
          />
        ))}
      </div>
    </section>
  );
}
