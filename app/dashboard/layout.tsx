import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { getIssuerNavItems } from '@/lib/issuer-nav';
import { IssuerShell } from '@/components/IssuerShell';

// Guards every issuer dashboard page. requireApprovedIssuerSession()
// (lib/auth/issuer.ts) redirects unauthenticated visitors to /login, staff
// accounts to /staff, and any org that isn't yet approved to /apply or
// /apply/status — the dashboard only exists for approved issuers
// (docs/sitemap.md §5).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgName } = await requireApprovedIssuerSession();
  const navItems = getIssuerNavItems();

  return (
    <IssuerShell navItems={navItems} orgName={orgName}>
      {children}
    </IssuerShell>
  );
}
