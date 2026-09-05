'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client — anon key only, respects RLS. Safe to import
 * from client components. Never import lib/supabase/admin.ts (service role)
 * from anywhere that ends up in the client bundle — see CLAUDE.md stack
 * conventions and rule #3.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
