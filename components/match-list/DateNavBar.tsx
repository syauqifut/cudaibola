'use client';

type DateNavBarProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
};

export function DateNavBar({ label, onPrev, onNext, disabled = false }: DateNavBarProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 border-[3px] border-ink bg-surface px-3 py-2 shadow-brutal-sm">
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled}
        className="btn-brutal border-2 border-ink bg-surface px-3 py-1 font-mono text-sm disabled:opacity-40"
        aria-label="Hari sebelumnya"
      >
        &larr;
      </button>

      <span className="min-w-0 flex-1 truncate text-center font-sans text-sm font-medium">
        {label}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="btn-brutal border-2 border-ink bg-surface px-3 py-1 font-mono text-sm disabled:opacity-40"
        aria-label="Hari berikutnya"
      >
        &rarr;
      </button>
    </div>
  );
}
