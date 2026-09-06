import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/permissions';

/**
 * The real /staff/* gate (docs/roles-permissions.md §5, CLAUDE.md rule #9) —
 * called from app/staff/layout.tsx so every staff page is covered, not just
 * the login page. Three things must all hold, none of them optional:
 *
 * 1. A valid Supabase session exists.
 * 2. MFA is fully verified this session (AAL2) — MFA is mandatory for staff,
 *    not just recommended (docs/roles-permissions.md §5). A password-only
 *    (AAL1) session is not enough even if the account has MFA enrolled.
 * 3. An active `admin_users` row exists for this uid. This is what actually
 *    distinguishes a staff account from an issuer/applicant one — user_type
 *    in auth metadata is a client-editable UX hint, never a security
 *    boundary (see app/(auth)/signup/page.tsx).
 *
 * Redirects to /staff/login on any failure rather than throwing, so a
 * revoked/suspended staff member or an issuer who wandered onto a /staff URL
 * both land somewhere sensible.
 */
export async function requireStaffSession(): Promise<{
  userId: string;
  role: StaffRole;
  name: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/staff/login');

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') redirect('/staff/login');

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role, status, name')
    .eq('id', user.id)
    .maybeSingle();

  if (!adminUser || adminUser.status !== 'active') redirect('/staff/login');

  return { userId: user.id, role: adminUser.role as StaffRole, name: adminUser.name };
}
