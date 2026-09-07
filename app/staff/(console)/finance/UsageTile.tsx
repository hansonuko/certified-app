import type { WarningLevel } from '@/lib/usage/free-tier';

const LEVEL_CLASS: Record<WarningLevel, string> = {
  ok: 'text-certified-success',
  warn: 'text-certified-warning',
  danger: 'text-certified-danger',
};

const LEVEL_BAR_CLASS: Record<WarningLevel, string> = {
  ok: 'bg-certified-success',
  warn: 'bg-certified-warning',
  danger: 'bg-certified-danger',
};

/**
 * One stat tile on /staff/finance: label, used/limit as already-formatted
 * strings (caller decides bytes vs. count formatting), a percentage bar,
 * and the three-state color (lib/usage/free-tier.ts's warningLevel — ok
 * under 70%, warn 70-90%, danger 90%+, this codebase's own thresholds for
 * the phase prompt's "visual warning state as any metric approaches its
 * limit"). `unavailable` renders a muted placeholder instead of a bar, for
 * live metrics that failed to read (e.g. migration 0024 not applied yet).
 */
export function UsageTile({
  label,
  usedLabel,
  limitLabel,
  ratio,
  level,
  sourceNote,
  unavailable,
  children,
}: {
  label: string;
  usedLabel: string;
  limitLabel: string;
  ratio: number;
  level: WarningLevel;
  sourceNote: string;
  unavailable?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-certified-border p-6">
      <h3 className="font-display text-base text-certified-navy">{label}</h3>

      {unavailable ? (
        <p className="text-sm text-certified-muted">Unavailable — see {sourceNote}.</p>
      ) : (
        <>
          <p className={`text-2xl font-semibold ${LEVEL_CLASS[level]}`}>{usedLabel}</p>
          <p className="text-sm text-certified-muted">of {limitLabel}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-certified-surface-2">
            <div
              className={`h-full ${LEVEL_BAR_CLASS[level]}`}
              style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
            />
          </div>
          <p className="text-xs text-certified-muted">{sourceNote}</p>
        </>
      )}

      {children}
    </div>
  );
}
