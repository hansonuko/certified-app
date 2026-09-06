'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls the current route via router.refresh() (an RSC re-fetch, not a full
 * page reload) while `active` is true. Used by the bulk-issuance job status
 * page (docs/build-phases.md Phase 7) to give the "progress view" blueprint
 * asks for without hand-rolling a websocket/SSE channel for what's
 * otherwise a simple polling need.
 */
export function AutoRefresh({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
