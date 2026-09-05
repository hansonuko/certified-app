import { requireStaffSession } from '@/lib/auth/staff';

// Guards every real staff-console page (docs/roles-permissions.md §5) — but
// deliberately not app/staff/login/**, which lives as a sibling outside this
// (console) route group so the login/MFA pages themselves stay reachable
// pre-auth. requireStaffSession() redirects to /staff/login on any failure;
// see lib/auth/staff.ts for what "failure" covers (no session, AAL1 instead
// of AAL2, no active admin_users row).
export default async function StaffConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireStaffSession();
  return <>{children}</>;
}
