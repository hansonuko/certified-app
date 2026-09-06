/**
 * Issuer dashboard sidebar nav — docs/sitemap.md §5. Every approved issuer
 * sees the same full nav from day one (docs/build-phases.md Phase 3:
 * "Scaffold every page... even where the feature ships in a later phase
 * ... so the nav is complete"), unlike the staff console's nav
 * (lib/staff-nav.ts) which only grows as each item's real functionality
 * ships. `comingSoon` items still link to a real route — just one that
 * renders a "coming soon" placeholder instead of 404ing.
 */
export type IssuerNavItem = { href: string; label: string; comingSoon?: boolean };

export function getIssuerNavItems(): IssuerNavItem[] {
  return [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/brand', label: 'Brand' },
    { href: '/dashboard/programs', label: 'Programs', comingSoon: true },
    { href: '/dashboard/certificates', label: 'Certificates', comingSoon: true },
    { href: '/dashboard/trainees', label: 'Trainees', comingSoon: true },
    { href: '/dashboard/directory-profile', label: 'Directory Profile', comingSoon: true },
    { href: '/dashboard/messages', label: 'Messages', comingSoon: true },
    { href: '/dashboard/settings', label: 'Settings', comingSoon: true },
    { href: '/dashboard/billing', label: 'Billing', comingSoon: true },
    { href: '/dashboard/help', label: 'Help', comingSoon: true },
  ];
}
