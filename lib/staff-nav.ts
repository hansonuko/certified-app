import type { StaffRole } from '@/lib/permissions';

/**
 * The staff console sidebar's nav items, computed server-side from the
 * logged-in AdminUser.role (docs/design-system.md §8: "Sidebar nav item
 * visibility is role-driven at the data layer, not CSS-hidden — a Finance
 * staff account's sidebar literally never requests or renders the
 * 'Applications' nav item"). Scoped to what Phase 2 actually builds
 * (docs/build-phases.md) — Organizations/Certificates/Revocations/etc. are
 * later phases (2.5, 2.75, 9) and aren't listed here yet even though
 * docs/sitemap.md §6 names them, so this list grows phase by phase rather
 * than linking to routes that don't exist.
 */
export type StaffNavItem = { href: string; label: string };

export function getStaffNavItems(role: StaffRole): StaffNavItem[] {
  const items: StaffNavItem[] = [{ href: '/staff', label: 'Overview' }];

  if (role === 'admin' || role === 'account_manager') {
    items.push({ href: '/staff/applications', label: 'Applications' });
  }

  return items;
}
