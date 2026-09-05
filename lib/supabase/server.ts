import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for use inside Server Components, Route
 * Handlers, and Server Actions — anon key + the caller's own session cookie,
 * so every read/write still goes through RLS as that user. This is NOT the
 * service-role client; for privileged staff operations that must bypass RLS,
 * use lib/supabase/admin.ts instead, and only inside an API route/server
 * action after a `can(role, action)` check (CLAUDE.md rule #9).
 *
 * Must be called fresh per request (it reads the request's cookies) — don't
 * hoist the result into a module-level singleton.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component that can't set cookies (e.g. a
            // static render) — safe to ignore as long as middleware is also
            // refreshing the session, per the standard @supabase/ssr pattern.
          }
        },
      },
    },
  );
}
