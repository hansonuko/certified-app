import { createClient } from '@/lib/supabase/server';

export type AccountLink = { email: string; href: string; label: string } | null;

/**
 * Resolves what the public site header's account link should point at for
 * the current session (components/SiteHeader.tsx). `/login` and `/signup`
 * are shared by three different account shapes — issuer/applicant, staff,
 * and a claimed-trainee-only account (docs/sitemap.md §3/§6) — so "Dashboard"
 * isn't always the right destination for someone who's merely logged in.
 *
 * Staff never see this: /staff has its own separate login surface
 * (docs/roles-permissions.md §5) and isn't linked from the public nav, so a
 * staff session landing on a marketing page (unusual, but possible since
 * it's the same underlying Supabase Auth project) just falls through to the
 * generic "My account" case below rather than being routed into /staff.
 */
export async function getAccountLink(): Promise<AccountLink> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: org }, { data: trainee }] = await Promise.all([
    supabase.from('organizations').select('id').eq('owner_user_id', user.id).maybeSingle(),
    supabase.from('trainees').select('id').eq('claimed_by_user_id', user.id).limit(1).maybeSingle(),
  ]);

  if (org) return { email: user.email ?? '', href: '/dashboard', label: 'Dashboard' };
  if (trainee) return { email: user.email ?? '', href: '/profile', label: 'My profile' };
  return { email: user.email ?? '', href: '/apply', label: 'My account' };
}
