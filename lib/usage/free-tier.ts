/**
 * Server-side usage readers for /staff/finance's usage-vs-free-tier
 * dashboard (docs/build-phases.md Phase 9, CLAUDE.md's free-tier
 * discipline — this is the early-warning system that section exists to
 * support). Two sources are read live because Postgres itself is the
 * source of truth for them; the other three (Resend, Upstash, Vercel) have
 * no live source available in this stack:
 *
 * - Resend's public API doesn't expose a "emails sent this month" endpoint,
 *   and this codebase has no send-ledger table to count locally (lib/
 *   email/send.ts doesn't log successful sends anywhere durable) — adding
 *   one is a real schema decision, not this phase's own scope.
 * - Upstash's command-count is only available via their separate
 *   *management* API (a personal access token + project id), which is a
 *   different credential from the UPSTASH_REDIS_REST_URL/TOKEN pair this
 *   project already has in .env.example for the data-plane rate limiters —
 *   and Upstash itself is still unconfigured anyway (docs/session-
 *   handoff.md §3 item 5).
 * - Vercel's own invocation/usage API needs a Vercel API token + project
 *   id, neither of which this project's env vars carry — the phase's own
 *   prompt explicitly allows "manual entry" for this one.
 *
 * All three are therefore manual-entry fields in the UI (components/
 * ManualUsageTile.tsx), persisted to the viewing browser's localStorage
 * rather than a new database table — a deliberate v1 shortcut (not shared
 * across staff, resets per browser) flagged here the same way this
 * codebase flags its other v1 shortcuts (e.g. app/directory/page.tsx's
 * pagination comment). Wiring a real email-send ledger or an Upstash/
 * Vercel management-API integration is a natural follow-up, not blocking
 * this phase's own "early-warning system" goal.
 *
 * Free-tier ceiling figures below are current best knowledge at the time
 * this was written, not a live-checked contract with each provider —
 * they're startingly stable numbers (Supabase's 500MB/1GB tiers and
 * Resend's 3,000/month tier have held for a long time), but re-verify
 * against each provider's own pricing page periodically since they do
 * change, and the manual-entry ceilings are editable in the UI for
 * exactly this reason.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export const FREE_TIER_LIMITS = {
  supabaseDbBytes: 500 * 1024 * 1024, // Supabase Free: 500MB database
  supabaseStorageBytes: 1024 * 1024 * 1024, // Supabase Free: 1GB file storage
  resendEmailsPerMonth: 3000, // Resend Free: 3,000/month (100/day)
  upstashCommandsPerMonth: 500_000, // Upstash Free: ~500k commands/month (verify current figure)
  vercelInvocations: 1_000_000, // No confidently-known current figure — placeholder, edit in the UI
} as const;

export type LiveUsage = {
  databaseBytes: number | null;
  storageBytes: number | null;
};

/**
 * Reads the two metrics Postgres itself can answer, via the RPCs in
 * migration 0024 (both SECURITY DEFINER — see that migration's header
 * comment for why a function was needed instead of a direct table/schema
 * query). Returns null for either value on any failure — most likely the
 * migration hasn't been applied to this project's SQL Editor yet — rather
 * than throwing, so the page renders those tiles as "unavailable" instead
 * of failing the whole dashboard.
 */
export async function getLiveSupabaseUsage(): Promise<LiveUsage> {
  const admin = createAdminClient();

  const [dbResult, storageResult] = await Promise.all([
    admin.rpc('get_database_size_bytes'),
    admin.rpc('get_storage_size_bytes'),
  ]);

  const databaseBytes = typeof dbResult.data === 'number' ? dbResult.data : null;
  const storageBytes = typeof storageResult.data === 'number' ? storageResult.data : null;

  return { databaseBytes, storageBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export type WarningLevel = 'ok' | 'warn' | 'danger';

/** Matches the phase prompt's "visual warning state as any metric approaches its limit" — thresholds are this codebase's own call, not provider-specified. */
export function warningLevel(used: number, limit: number): WarningLevel {
  if (limit <= 0) return 'ok';
  const ratio = used / limit;
  if (ratio >= 0.9) return 'danger';
  if (ratio >= 0.7) return 'warn';
  return 'ok';
}
