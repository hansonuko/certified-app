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
    <div className="relative flex min-h-screen flex-col">
      <DarkModeGlow />
      <SiteHeader />
      <div className="relative flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}

// Ambient blue glow blobs behind the page content, dark mode only — this is
// the piece that actually needs the page canvas underneath the glass
// surfaces (components/SiteHeaderClient.tsx, SiteFooter.tsx, marketing/
// shared.tsx's Card) to have some texture, otherwise "backdrop-blur" over a
// perfectly flat color has nothing to blur and just looks like a flat tint.
// Fixed + pointer-events-none + aria-hidden: purely decorative, never
// affects layout or interaction.
function DarkModeGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden dark:block">
      <div className="absolute -top-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-certified-gold/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[24rem] w-[24rem] rounded-full bg-blue-500/15 blur-[100px]" />
    </div>
  );
}
