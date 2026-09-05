import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every request that passes through
 * middleware.ts — the standard @supabase/ssr pattern for Next.js App Router.
 * Without this, server components can end up reading a stale/expired session
 * cookie. Does not itself gate any route; route-level auth checks (issuer vs.
 * staff vs. public) live in the routes themselves.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touches the session so @supabase/ssr refreshes it if needed — the return
  // value is unused here on purpose, this call is for its cookie side effect.
  await supabase.auth.getUser();

  return response;
}
