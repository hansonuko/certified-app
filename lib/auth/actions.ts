'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Shared sign-out action for the public site header (components/SiteHeader.tsx).
 * Nothing in the app had a logout path before this — issuer/staff shells
 * (components/IssuerShell.tsx, components/StaffShell.tsx) don't wire one
 * either, worth fixing there too in a follow-up, but out of scope for the
 * marketing-site pass this was written for.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
