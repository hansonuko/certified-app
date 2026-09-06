import type { StaffRole } from '@/lib/permissions';

/**
 * The staff console sidebar's nav items, computed server-side from the
 * logged-in AdminUser.role (docs/design-system.md §8: "Sidebar nav item
 * visibility is role-driven at the data layer, not CSS-hidden — a Finance
 * staff account's sidebar literally never requests or renders the
 * 'Applications' nav item"). Scoped to what's actually built so far
 * (docs/build-phases.md Phases 2-2.5) — Certificates/Revocations/
 * Moderation/Support (also Phase 2.5's stated scope) are deferred until
 * Phase 4/5/6 give them real Certificates/Trainees/contact-form data to
 * operate on, rather than shipping as empty shells now. This list grows
 * phase by phase rather than linking to routes that don't exist.
 *
 * Organizations is admin+account_manager only for now, even though
 * Finance's role has the underlying view_organizations capability
 * (docs/roles-permissions.md §2, limited columns) — Phase 2.5's own
 * prompt defers building Finance's reduced-field view of this route to
 * Phase 9, so the route itself excludes Finance until then (see
 * app/staff/(console)/organizations/page.tsx).
 */
export type StaffNavItem = { href: string; label: string };

export function getStaffNavItems(role: StaffRole): StaffNavItem[] {
  const items: StaffNavItem[] = [{ href: '/staff', label: 'Overview' }];

  if (role === 'admin' || role === 'account_manager') {
    items.push({ href: '/staff/applications', label: 'Applications' });
    items.push({ href: '/staff/organizations', label: 'Organizations' });
  }

  return items;
}
