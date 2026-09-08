/**
 * Picks which Account Manager a newly-created organization gets assigned
 * to (supabase/migrations/0027's assigned_account_manager_id column).
 * Always reads through the service-role client, never the caller's own
 * session client — computing the round-robin needs to read every active
 * Account Manager's current org count, and `admin_users` has no RLS policy
 * that grants a non-Admin (an applicant, or an Account Manager themselves)
 * that visibility (supabase/migrations/0002's admin_users_admin_all is
 * Admin-only). The picked id is then just a plain value in the caller's
 * own insert — nothing here needs to be trusted input, it's fully computed
 * server-side.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { StaffRole } from '@/lib/permissions';

/**
 * @param creator If the org is being created by a staff member who is
 *   themselves an Account Manager (the manual-entry path, app/staff/
 *   (console)/organizations/new), assign straight to them — "I added this
 *   org, it's mine" is the more intuitive default than round-robin
 *   spreading it to someone else. Omitted (or a non-AM role, e.g. Admin
 *   using manual entry, or the public /apply flow which has no staff
 *   creator at all) falls through to round-robin.
 */
export async function pickAccountManagerForAssignment(creator?: {
  id: string;
  role: StaffRole;
}): Promise<string | null> {
  if (creator?.role === 'account_manager') {
    return creator.id;
  }

  const admin = createAdminClient();

  const { data: managers } = await admin
    .from('admin_users')
    .select('id')
    .eq('role', 'account_manager')
    .eq('status', 'active');
  if (!managers || managers.length === 0) return null; // no active AM to assign to — Admin can assign one later

  const { data: assignedOrgs } = await admin
    .from('organizations')
    .select('assigned_account_manager_id')
    .not('assigned_account_manager_id', 'is', null);

  const counts = new Map<string, number>(managers.map((m) => [m.id, 0]));
  for (const org of assignedOrgs ?? []) {
    const id = org.assigned_account_manager_id;
    if (id && counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  // Fewest currently-assigned orgs wins; ties broken by managers' query
  // order (stable, if arbitrary) — good enough at this project's scale,
  // same "revisit if this ever needs to be fairer under real load" spirit
  // as this codebase's other simple v1 heuristics (e.g. lib/analytics/
  // operational.ts's anomaly thresholds).
  let picked = managers[0].id;
  let pickedCount = counts.get(picked) ?? 0;
  for (const m of managers) {
    const count = counts.get(m.id) ?? 0;
    if (count < pickedCount) {
      picked = m.id;
      pickedCount = count;
    }
  }
  return picked;
}
