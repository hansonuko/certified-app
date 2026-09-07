import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

/**
 * The public shell (docs/sitemap.md §8): header + footer wrapping every
 * public-facing surface — marketing pages, directory, verification, and the
 * auth pages (see app/(marketing)/layout.tsx, app/directory/layout.tsx,
 * app/verify/layout.tsx, app/(auth)/layout.tsx). Deliberately excludes the
 * issuer dashboard (components/IssuerShell.tsx), staff console
 * (components/StaffShell.tsx), and /staff/login (its own separate surface,
 * docs/roles-permissions.md §5) — those never render this.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
