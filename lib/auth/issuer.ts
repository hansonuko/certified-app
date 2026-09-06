import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * The /dashboard/* gate — the other half of "issuer and staff sessions never
 * cross over" (docs/build-phases.md Phase 0). A staff account signing in at
 * /login (same underlying Supabase Auth project, so nothing stops them
 * technically trying) still gets redirected away from the issuer dashboard,
 * because their uid has a row in admin_users. Staff use /staff, never
 * /dashboard, even though they could authenticate at either URL.
 */
export async function requireIssuerSession(): Promise<{ userId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (adminUser) redirect('/staff');

  return { userId: user.id };
}

/**
 * The /dashboard/* gate specifically — docs/sitemap.md §5 marks the issuer
 * dashboard "🔒 approved issuers", not just any authenticated non-staff
 * user. An applicant with no Organization yet, or one still pending/
 * rejected/suspended, gets sent to /apply or /apply/status instead — the
 * dashboard only exists once there's an approved org to configure
 * (CLAUDE.md rule #1: no issuance-adjacent surface reachable before
 * approval).
 */
export async function requireApprovedIssuerSession(): Promise<{
  userId: string;
  orgId: string;
  orgName: string;
}> {
  const { userId } = await requireIssuerSession();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, display_name, status')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (!org) redirect('/apply');
  if (org.status !== 'approved') redirect('/apply/status');

  return { userId, orgId: org.id, orgName: org.display_name };
}
