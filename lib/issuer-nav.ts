/**
 * Issuer dashboard sidebar nav — docs/sitemap.md §5. Every approved issuer
 * sees the same full nav from day one (docs/build-phases.md Phase 3:
 * "Scaffold every page... even where the feature ships in a later phase
 * ... so the nav is complete"), unlike the staff console's nav
 * (lib/staff-nav.ts) which only grows as each item's real functionality
 * ships. `comingSoon` items still link to a real route — just one that
 * renders a "coming soon" placeholder instead of 404ing.
 *
 * Billing carries no comingSoon badge — since docs/build-phases.md Phase 11
 * item 1 (Monetization Flow A, 2026-09) it's a real page (certificate-credit
 * balance and top-up), not a placeholder at all anymore.
 */
export type IssuerNavItem = { href: string; label: string; comingSoon?: boolean };

export function getIssuerNavItems(): IssuerNavItem[] {
  return [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/brand', label: 'Brand' },
    { href: '/dashboard/programs', label: 'Programs' },
    { href: '/dashboard/certificates', label: 'Certificates' },
    { href: '/dashboard/trainees', label: 'Trainees' },
    { href: '/dashboard/directory-profile', label: 'Directory Profile' },
    { href: '/dashboard/messages', label: 'Messages' },
    { href: '/dashboard/settings', label: 'Settings' },
    { href: '/dashboard/billing', label: 'Billing' },
    { href: '/dashboard/help', label: 'Help' },
  ];
}
