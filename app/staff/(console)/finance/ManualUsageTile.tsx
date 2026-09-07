'use client';

import { useEffect, useState } from 'react';
import { warningLevel } from '@/lib/usage/free-tier';
import { UsageTile } from './UsageTile';

/**
 * Manual-entry counterpart to UsageTile, for the three metrics with no live
 * source in this stack (Resend, Upstash, Vercel — see lib/usage/free-
 * tier.ts's header comment for why). Persists to this browser's
 * localStorage only, keyed by `storageKey` — not shared across staff
 * members or devices, a deliberate v1 shortcut. Both the "used" figure and
 * the ceiling are editable, since the ceiling itself isn't confidently
 * known for all three providers at the time this was written.
 */
export function ManualUsageTile({
  label,
  storageKey,
  defaultLimit,
  unitLabel,
  sourceNote,
}: {
  label: string;
  storageKey: string;
  defaultLimit: number;
  unitLabel: string;
  sourceNote: string;
}) {
  const [used, setUsed] = useState<number | null>(null);
  const [limit, setLimit] = useState(defaultLimit);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { used?: number; limit?: number };
        if (typeof parsed.used === 'number') setUsed(parsed.used);
        if (typeof parsed.limit === 'number') setLimit(parsed.limit);
      }
    } catch {
      // Corrupt/unavailable localStorage — fall back to defaults, not a crash.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextUsed: number | null, nextLimit: number) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ used: nextUsed, limit: nextLimit }));
    } catch {
      // Best-effort only — a private-browsing tab with localStorage disabled
      // shouldn't break entering a number for this session.
    }
  }

  if (!hydrated) {
    return <UsageTile label={label} usedLabel="…" limitLabel="…" ratio={0} level="ok" sourceNote={sourceNote} />;
  }

  const level = used === null ? 'ok' : warningLevel(used, limit);

  return (
    <UsageTile
      label={label}
      usedLabel={used === null ? 'Not entered' : `${used.toLocaleString()} ${unitLabel}`}
      limitLabel={`${limit.toLocaleString()} ${unitLabel} (manual)`}
      ratio={used === null ? 0 : used / limit}
      level={level}
      sourceNote={sourceNote}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const usedInput = Number((form.elements.namedItem('used') as HTMLInputElement).value);
          const limitInput = Number((form.elements.namedItem('limit') as HTMLInputElement).value);
          setUsed(usedInput);
          setLimit(limitInput);
          persist(usedInput, limitInput);
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          type="number"
          name="used"
          min={0}
          defaultValue={used ?? ''}
          placeholder="Used"
          className="w-24 rounded-control border border-certified-border px-2 py-1 text-xs"
        />
        <input
          type="number"
          name="limit"
          min={1}
          defaultValue={limit}
          placeholder="Limit"
          className="w-24 rounded-control border border-certified-border px-2 py-1 text-xs"
        />
        <button type="submit" className="rounded-control border border-certified-border px-2 py-1 text-xs">
          Save
        </button>
      </form>
    </UsageTile>
  );
}
