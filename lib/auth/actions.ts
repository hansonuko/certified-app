'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Shared sign-out action — originally written for the public site header
 * (components/SiteHeader.tsx), now also wired into the issuer
 * (components/IssuerShell.tsx) dashboard shell, closing (half of) the gap
 * this file's own comment used to flag. Bound directly to a
 * `<form action={signOutAction}>`, so its signature has to stay
 * `(formData: FormData) => Promise<void>` — a form action is always
 * called with the submitted FormData as its one argument, whether or not
 * the action reads it.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/**
 * Same sign-out, but for components/StaffShell.tsx: lands back on
 * /staff/login instead of the public homepage — signOutAction's '/'
 * would just make a signed-out staff member click back through to the
 * staff-specific login surface (docs/roles-permissions.md §5) for no
 * reason. A separate function rather than a parameterized signOutAction
 * since a form action's signature can't take an extra caller-supplied
 * argument alongside the FormData Next.js always passes it.
 */
export async function signOutStaffAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/staff/login');
}
