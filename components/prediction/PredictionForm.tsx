'use client';

import { useState, type FormEvent } from 'react';

import { toUserMessage } from '@/lib/shared/user-error';

type PredictionFormProps = {
  matchId: string;
  userId: string;
  initialHomeScore?: number;
  initialAwayScore?: number;
  onSuccess?: (saved: {
    predictedHomeScore: number;
    predictedAwayScore: number;
  }) => void;
};

export function PredictionForm({
  matchId,
  userId,
  initialHomeScore,
  initialAwayScore,
  onSuccess,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(
    initialHomeScore != null ? String(initialHomeScore) : '',
  );
  const [awayScore, setAwayScore] = useState(
    initialAwayScore != null ? String(initialAwayScore) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedHome = Number.parseInt(homeScore, 10);
    const parsedAway = Number.parseInt(awayScore, 10);

    if (
      Number.isNaN(parsedHome) ||
      Number.isNaN(parsedAway) ||
      !Number.isInteger(parsedHome) ||
      !Number.isInteger(parsedAway)
    ) {
      setError('Skor harus berupa angka bulat 0 sampai 20.');
      return;
    }

    if (
      parsedHome < 0 ||
      parsedHome > 20 ||
      parsedAway < 0 ||
      parsedAway > 20
    ) {
      setError('Skor harus berupa angka 0 sampai 20.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          matchId,
          predictedHomeScore: parsedHome,
          predictedAwayScore: parsedAway,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        predictedHomeScore?: number;
        predictedAwayScore?: number;
      };

      if (!response.ok) {
        const fallback =
          response.status >= 500
            ? 'Gagal menyimpan tebakan. Coba lagi.'
            : 'Gagal menyimpan tebakan.';
        throw new Error(data.error ?? fallback);
      }

      onSuccess?.({
        predictedHomeScore: data.predictedHomeScore ?? parsedHome,
        predictedAwayScore: data.predictedAwayScore ?? parsedAway,
      });
    } catch (submitError) {
      setError(
        toUserMessage(submitError, 'Gagal menyimpan tebakan. Coba lagi.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <p className="font-sans text-xs uppercase tracking-wide text-ink/70">
        Tebakan skor
      </p>

      <div className="mt-3 flex items-center justify-center gap-3">
        <input
          type="number"
          min={0}
          max={20}
          step={1}
          inputMode="numeric"
          value={homeScore}
          onChange={(event) => setHomeScore(event.target.value)}
          aria-label="Skor tim tuan rumah"
          className="score-input-brutal h-[42px] w-[46px] border-[3px] border-ink bg-surface text-center font-mono text-lg"
        />
        <span className="font-mono text-lg text-ink/40">-</span>
        <input
          type="number"
          min={0}
          max={20}
          step={1}
          inputMode="numeric"
          value={awayScore}
          onChange={(event) => setAwayScore(event.target.value)}
          aria-label="Skor tim tamu"
          className="score-input-brutal h-[42px] w-[46px] border-[3px] border-ink bg-surface text-center font-mono text-lg"
        />
      </div>

      {error && (
        <p className="mt-3 text-center font-sans text-xs text-card-red">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-brutal mt-5 w-full border-[3px] border-ink bg-pitch-green py-3 font-mono text-sm disabled:opacity-50"
      >
        {isSubmitting ? 'MENYIMPAN...' : 'SUBMIT TEBAKAN'}
      </button>
    </form>
  );
}
