'use client';

import { useState, type FormEvent } from 'react';

type NicknamePromptProps = {
  onSubmit: (nickname: string) => Promise<void>;
};

export function NicknamePrompt({ onSubmit }: NicknamePromptProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(nickname);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Gagal menyimpan nickname.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
      role="dialog"
      aria-labelledby="nickname-prompt-title"
      aria-modal="false"
    >
      <div className="pointer-events-auto mx-auto max-w-2xl border-[3px] border-ink bg-surface p-5 shadow-brutal">
        <h2
          id="nickname-prompt-title"
          className="font-mono text-sm uppercase"
        >
          Isi nickname dulu
        </h2>
        <p className="mt-2 font-sans text-xs text-ink/80">
          Supaya bisa tebak skor dan muncul di klasemen. Match list di bawah tetap
          bisa dilihat tanpa nickname.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="font-sans text-xs" htmlFor="nickname-input">
            Nickname
          </label>
          <input
            id="nickname-input"
            type="text"
            maxLength={32}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Contoh: Setadewa"
            autoComplete="nickname"
            className="border-[3px] border-ink bg-pitch-white px-3 py-2 font-sans text-sm outline-none focus:bg-surface"
          />

          {error && (
            <p className="font-sans text-xs text-card-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || nickname.trim().length === 0}
            className="border-[3px] border-ink bg-pitch-green px-4 py-2 font-mono text-xs shadow-brutal-sm disabled:opacity-50"
          >
            {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN & LANJUT'}
          </button>
        </form>
      </div>
    </div>
  );
}
