'use client';

import { useEffect, useState } from 'react';

import { useIdentity } from '@/components/identity/IdentityProvider';
import { toUserMessage } from '@/lib/shared/user-error';
import type { LeaderboardEntry } from '@/lib/shared/types';

type LeaderboardPopupProps = {
  onClose: () => void;
};

function LeaderboardRow({
  entry,
  currentUserId,
}: {
  entry: LeaderboardEntry;
  currentUserId: string | null;
}) {
  const isCurrentUser = currentUserId === entry.userId;
  const isTopRank = entry.rank === 1;

  let rowClass = 'flex items-center gap-3 border-b-[3px] border-ink px-4 py-3';

  if (isCurrentUser) {
    rowClass += ' bg-pitch-green';
  } else if (isTopRank) {
    rowClass += ' bg-card-yellow';
  } else if (entry.rank > 3) {
    rowClass += ' opacity-65';
  }

  return (
    <li className={rowClass}>
      <span className="w-8 shrink-0 font-mono text-sm tabular-nums">
        {entry.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-sans">
        {entry.nickname}
        {isCurrentUser && (
          <span className="ml-1 font-sans text-xs text-ink/70">(kamu)</span>
        )}
      </span>
      <span className="shrink-0 font-mono text-xl tabular-nums">
        {entry.totalPoints}
      </span>
    </li>
  );
}

export function LeaderboardPopup({ onClose }: LeaderboardPopupProps) {
  const { identity } = useIdentity();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [seasonLabel, setSeasonLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/leaderboard');
        const data = (await response.json()) as {
          seasonLabel?: string;
          entries?: LeaderboardEntry[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? 'Gagal memuat klasemen.');
        }

        if (!cancelled) {
          setEntries(data.entries ?? []);
          setSeasonLabel(data.seasonLabel ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            toUserMessage(loadError, 'Gagal memuat klasemen. Coba lagi.'),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col border-[3px] border-ink bg-surface shadow-brutal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
      >
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span
              id="leaderboard-title"
              className="font-mono text-xs uppercase text-card-yellow"
            >
              KLASEMEN PREDIKSI
            </span>
            {seasonLabel && (
              <span className="font-mono text-xs text-card-yellow/70">
                {seasonLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-card-yellow px-2 py-1 font-mono text-xs text-card-yellow"
            aria-label="Tutup"
          >
            X
          </button>
        </div>

        <div className="overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-8 text-center font-sans text-sm text-ink/60">
              Memuat klasemen...
            </p>
          )}

          {error && (
            <p className="px-4 py-8 text-center font-sans text-sm text-card-red">
              {error}
            </p>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <p className="px-4 py-8 text-center font-sans text-sm text-ink/60">
              Belum ada data klasemen.
            </p>
          )}

          {!isLoading && !error && entries.length > 0 && (
            <ul>
              {entries.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  currentUserId={identity?.userId ?? null}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
