import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only, never
 * import this from a client component or anything that ends up in the client
 * bundle (CLAUDE.md rule #3, "signing key never touches the client" — the
 * same rule applies to this key). Only use inside API routes / server actions,
 * and only after a `can(role, action)` check from lib/permissions.ts for any
 * staff-facing operation (docs/roles-permissions.md §3).
 *
 * Not a singleton on purpose — importing this file at module scope in a file
 * that's part of the client bundle would throw immediately (no
 * NEXT_PUBLIC_ prefix means the env var is undefined in the browser), which
 * is a deliberate tripwire rather than a silent misconfiguration.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
