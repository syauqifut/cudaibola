'use client';

type EmptyStateProps = {
  onReload: () => void;
  isReloading?: boolean;
  error?: string | null;
};

export function EmptyState({
  onReload,
  isReloading = false,
  error = null,
}: EmptyStateProps) {
  return (
    <div className="border-[3px] border-ink bg-surface px-6 py-10 text-center shadow-brutal">
      <p className="font-sans text-sm">
        Belum ada data pertandingan untuk hari ini.
      </p>

      {error && (
        <p className="mt-3 font-sans text-xs text-card-red">{error}</p>
      )}

      <button
        type="button"
        onClick={onReload}
        disabled={isReloading}
        className="mt-6 border-[3px] border-ink bg-pitch-green px-5 py-2 font-mono text-xs shadow-brutal-sm disabled:opacity-50"
      >
        {isReloading ? 'MEMUAT...' : 'MUAT ULANG'}
      </button>
    </div>
  );
}
