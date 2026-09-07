// Public shell nav links (docs/sitemap.md §8: "top nav — logo, How it works,
// Directory, Verify, Apply, Login"). Plain data, no server/client-only
// imports, so both SiteHeader (server) and SiteHeaderClient can use it.
export const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/directory', label: 'Directory' },
  { href: '/verify', label: 'Verify' },
  { href: '/pricing', label: 'Pricing' },
] as const;
