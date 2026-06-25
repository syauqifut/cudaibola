import { CompetitionGroup } from '@/components/match-list/CompetitionGroup';
import type { CompetitionMatchGroup } from '@/lib/shared/types';

type MatchListProps = {
  groups: CompetitionMatchGroup[];
  onSelectMatch?: (matchId: string) => void;
};

export function MatchList({ groups, onSelectMatch }: MatchListProps) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <CompetitionGroup
          key={group.competitionId}
          group={group}
          onSelectMatch={onSelectMatch}
        />
      ))}
    </div>
  );
}
