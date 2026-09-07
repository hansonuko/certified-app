import type { StaffRole } from '@/lib/permissions';

/**
 * The staff console sidebar's nav items, computed server-side from the
 * logged-in AdminUser.role (docs/design-system.md §8: "Sidebar nav item
 * visibility is role-driven at the data layer, not CSS-hidden — a Finance
 * staff account's sidebar literally never requests or renders the
 * 'Applications' nav item"). Scoped to what's actually built so far
 * (docs/build-phases.md Phases 2-2.75) — Certificates/Revocations/
 * Moderation/Support (Phase 2.5's remaining scope) are still deferred,
 * per docs/session-handoff.md §3 item 4. This list grows phase by phase
 * rather than linking to routes that don't exist.
 *
 * Organizations is admin+account_manager only for now, even though
 * Finance's role has the underlying view_organizations capability
 * (docs/roles-permissions.md §2, limited columns) — Phase 2.5's own
 * prompt defers building Finance's reduced-field view of this route to
 * Phase 9, so the route itself excludes Finance until then (see
 * app/staff/(console)/organizations/page.tsx).
 *
 * Team (Phase 2.75) is Admin-only per the matrix — Account Manager and
 * Finance never receive it. Audit Log is different: every role has
 * `view_audit_log` in the matrix (docs/roles-permissions.md §2 — "own
 * actions only" for AM/Finance, not no access), so all three see the nav
 * item; the RLS policies on `audit_log` do the actual per-role scoping of
 * what the page shows once they're there.
 *
 * Finance (Phase 9 item 1) is Admin + Finance — the one nav item Account
 * Manager never receives even though it receives Applications/
 * Organizations, matching the matrix's own split (view_cost_usage_dashboard
 * is admin+finance only, the mirror image of view_operational_analytics
 * being admin+account_manager only).
 */
export type StaffNavItem = { href: string; label: string };

export function getStaffNavItems(role: StaffRole): StaffNavItem[] {
  const items: StaffNavItem[] = [{ href: '/staff', label: 'Overview' }];

  if (role === 'admin' || role === 'account_manager') {
    items.push({ href: '/staff/applications', label: 'Applications' });
    items.push({ href: '/staff/organizations', label: 'Organizations' });
  }

  if (role === 'admin') {
    items.push({ href: '/staff/team', label: 'Team' });
  }

  items.push({ href: '/staff/audit-log', label: 'Audit Log' });

  if (role === 'admin' || role === 'finance') {
    items.push({ href: '/staff/finance', label: 'Finance' });
  }

  if (role === 'admin') {
    items.push({ href: '/staff/settings', label: 'Settings' });
  }

  return items;
}
