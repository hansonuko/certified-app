import { requireStaffSession } from '@/lib/auth/staff';
import { getStaffNavItems } from '@/lib/staff-nav';
import { StaffShell } from '@/components/StaffShell';

// Guards every real staff-console page (docs/roles-permissions.md §5) —
// deliberately not app/staff/login/**, which lives as a sibling outside this
// (console) route group so the login/MFA pages themselves stay reachable
// pre-auth. requireStaffSession() redirects to /staff/login on any failure;
// see lib/auth/staff.ts for what "failure" covers (no session, AAL1 instead
// of AAL2, no active admin_users row).
export default async function StaffConsoleLayout({ children }: { children: React.ReactNode }) {
  const { role, name } = await requireStaffSession();
  const navItems = getStaffNavItems(role);

  return (
    <StaffShell navItems={navItems} role={role} name={name}>
      {children}
    </StaffShell>
  );
}
