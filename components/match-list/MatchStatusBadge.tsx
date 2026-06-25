import type { MatchStatus } from '@/lib/shared/types';

type MatchStatusBadgeProps = {
  status: MatchStatus;
  pointsEarned?: number | null;
};

const badgeBase =
  'shrink-0 border-2 border-ink px-2.5 py-1 font-mono text-[10px] leading-none';

export function MatchStatusBadge({ status, pointsEarned }: MatchStatusBadgeProps) {
  if (status === 'scheduled') {
    return (
      <span className={`${badgeBase} bg-pitch-green text-ink`}>TEBAK</span>
    );
  }

  if (status === 'live') {
    return (
      <span className={`${badgeBase} bg-card-yellow text-ink`}>TERKUNCI</span>
    );
  }

  if (pointsEarned != null) {
    return (
      <span className={`${badgeBase} bg-ink text-card-yellow`}>
        +{pointsEarned} POIN
      </span>
    );
  }

  return (
    <span className={`${badgeBase} bg-card-yellow text-ink`}>TERKUNCI</span>
  );
}
