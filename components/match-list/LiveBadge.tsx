type LiveBadgeProps = {
  minute: number;
};

export function LiveBadge({ minute }: LiveBadgeProps) {
  return (
    <span className="border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[10px] text-pitch-green">
      LIVE · {minute}&apos;
    </span>
  );
}
