'use client';

import { useState } from 'react';

import { useIdentity } from '@/components/identity/IdentityProvider';
import { LeaderboardPopup } from '@/components/leaderboard/LeaderboardPopup';

export function PageHeader() {
  const { identity } = useIdentity();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl uppercase tracking-tight">Cudaibola</h1>
          <p className="mt-1 font-sans text-xs text-ink/70">
            Progres kamu tersimpan di browser ini saja.
          </p>
          {identity && (
            <p className="mt-1 font-sans text-xs">
              Halo, <span className="font-medium">{identity.nickname}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowLeaderboard(true)}
          className="btn-brutal shrink-0 border-[3px] border-ink bg-surface px-4 py-2 font-mono text-xs"
        >
          KLASEMEN
        </button>
      </header>

      {showLeaderboard && (
        <LeaderboardPopup onClose={() => setShowLeaderboard(false)} />
      )}
    </>
  );
}
