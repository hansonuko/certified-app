import { requireIssuerSession } from '@/lib/auth/issuer';

// Guards every issuer dashboard page. requireIssuerSession() (lib/auth/
// issuer.ts) redirects unauthenticated visitors to /login, and redirects any
// account that has an admin_users row to /staff instead — the other half of
// "issuer and staff sessions never cross over" alongside app/staff/(console)/
// layout.tsx.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireIssuerSession();
  return <>{children}</>;
}
