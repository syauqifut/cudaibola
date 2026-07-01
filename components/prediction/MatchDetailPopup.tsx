'use client';

import { useEffect, useState } from 'react';

import { useIdentity } from '@/components/identity/IdentityProvider';
import { LiveBadge } from '@/components/match-list/LiveBadge';
import { MatchStatusBadge } from '@/components/match-list/MatchStatusBadge';
import { PredictionForm } from '@/components/prediction/PredictionForm';
import { matchHasTbdTeam } from '@/lib/shared/constants';
import { formatKickoffTime } from '@/lib/shared/format-time';
import type { MatchWithCompetition } from '@/lib/shared/types';

type ExistingPrediction = {
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsEarned: number | null;
};

type MatchDetailPopupProps = {
  match: MatchWithCompetition;
  onClose: () => void;
};

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '–';
  return `${home} - ${away}`;
}

export function MatchDetailPopup({ match, onClose }: MatchDetailPopupProps) {
  const { identity } = useIdentity();
  const [existingPrediction, setExistingPrediction] =
    useState<ExistingPrediction | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);

  const kickoff = new Date(match.kickoffTime);
  const competitionLabel =
    match.competitionShortName ?? match.competitionName;
  const isScheduled = match.status === 'scheduled';
  const hasTbdTeam = matchHasTbdTeam(match);

  useEffect(() => {
    if (!identity) {
      setExistingPrediction(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPrediction(true);

    async function loadPrediction() {
      try {
        const params = new URLSearchParams({
          userId: identity!.userId,
          matchId: match.id,
        });
        const response = await fetch(`/api/predictions?${params.toString()}`);
        const data = (await response.json()) as {
          prediction: ExistingPrediction | null;
        };

        if (!cancelled) {
          setExistingPrediction(data.prediction);
        }
      } catch {
        if (!cancelled) {
          setExistingPrediction(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPrediction(false);
        }
      }
    }

    void loadPrediction();

    return () => {
      cancelled = true;
    };
  }, [identity, match.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-[3px] border-ink bg-surface shadow-brutal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-detail-title"
      >
        <div
          className={`border-b-[3px] border-ink px-4 py-3 ${
            isScheduled ? 'bg-pitch-green' : 'bg-ink'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                id="match-detail-title"
                className={`font-sans text-sm ${isScheduled ? 'text-ink' : 'text-pitch-white'}`}
              >
                {competitionLabel}
                {match.roundName ? ` · ${match.roundName}` : ''}
              </p>
              {!isScheduled && (
                <div className="mt-2">
                  {match.status === 'live' && match.minute != null ? (
                    <LiveBadge minute={match.minute} />
                  ) : (
                    <span className="font-mono text-xs text-pitch-green">FT</span>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`btn-brutal border-2 border-ink px-2 py-1 font-mono text-xs ${
                isScheduled
                  ? 'bg-surface text-ink'
                  : 'bg-ink text-pitch-white'
              }`}
              aria-label="Tutup"
            >
              X
            </button>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <span className="flex-1 text-center font-sans">{match.homeTeamName}</span>
            <div className="shrink-0 text-center">
              {isScheduled ? (
                <span className="font-mono text-2xl tabular-nums">
                  {formatKickoffTime(kickoff)}
                </span>
              ) : (
                <span className="font-mono text-3xl tabular-nums">
                  {formatScore(match.homeScore, match.awayScore)}
                </span>
              )}
            </div>
            <span className="flex-1 text-center font-sans">{match.awayTeamName}</span>
          </div>

          {isScheduled && hasTbdTeam && (
            <p className="mt-6 border-2 border-ink bg-card-yellow px-3 py-2 font-sans text-xs">
              Lawan belum ditentukan. Tebakan dibuka setelah kedua tim jelas.
            </p>
          )}

          {isScheduled && !hasTbdTeam && (
            <>
              {!identity && (
                <p className="mt-6 border-2 border-ink bg-card-yellow px-3 py-2 font-sans text-xs">
                  Isi nickname dulu supaya bisa submit tebakan.
                </p>
              )}

              {identity && !isLoadingPrediction && (
                <PredictionForm
                  matchId={match.id}
                  userId={identity.userId}
                  initialHomeScore={existingPrediction?.predictedHomeScore}
                  initialAwayScore={existingPrediction?.predictedAwayScore}
                  onSuccess={(saved) => {
                    setExistingPrediction({
                      ...saved,
                      pointsEarned: null,
                    });
                    onClose();
                  }}
                />
              )}

              {identity && isLoadingPrediction && (
                <p className="mt-6 text-center font-sans text-xs text-ink/60">
                  Memuat tebakan...
                </p>
              )}
            </>
          )}

          {!isScheduled && (
            <div className="mt-6 border-t-[3px] border-ink pt-4">
              {isLoadingPrediction ? (
                <p className="font-sans text-xs text-ink/60">Memuat tebakan...</p>
              ) : identity && existingPrediction ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="font-sans text-sm">
                    Tebakanmu:{' '}
                    <span className="font-mono">
                      {existingPrediction.predictedHomeScore} -{' '}
                      {existingPrediction.predictedAwayScore}
                    </span>
                  </p>
                  <MatchStatusBadge
                    status={match.status}
                    pointsEarned={existingPrediction.pointsEarned}
                  />
                </div>
              ) : (
                <p className="font-sans text-xs text-ink/60">
                  {identity
                    ? 'Belum ada tebakan untuk pertandingan ini.'
                    : 'Isi nickname untuk tebak skor.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
