import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { getStaffAccounts } from './actions';
import { InviteForm } from './InviteForm';
import { StaffRow } from './StaffRow';
import { PermissionsMatrix } from './PermissionsMatrix';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  account_manager: 'Account Manager',
  finance: 'Finance',
};

// /staff/team (docs/build-phases.md Phase 2.75, docs/sitemap.md §6). Admin
// only — lib/staff-nav.ts never renders this item for Account Manager or
// Finance, and this page-level check is the real boundary per CLAUDE.md
// rule #9 (a direct hit on the URL must still 403/redirect).
export default async function TeamPage() {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'manage_staff_accounts')) redirect('/staff');

  const staff = await getStaffAccounts();

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Team</h1>

      <InviteForm />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-certified-border text-certified-muted">
            <th className="py-2">Name</th>
            <th className="py-2">Email</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
            <th className="py-2">Added</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b border-certified-border">
              <td className="py-2">{member.name}</td>
              <td className="py-2">{member.email}</td>
              <td className="py-2">{ROLE_LABEL[member.role] ?? member.role}</td>
              <td className="py-2">
                {member.status === 'deactivated' ? 'Deactivated' : member.status === 'suspended' ? 'Suspended' : 'Active'}
              </td>
              <td className="py-2">{new Date(member.created_at).toLocaleDateString()}</td>
              <td className="py-2">
                <StaffRow staffId={member.id} currentRole={member.role} status={member.status} isSelf={member.id === userId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <PermissionsMatrix />
    </main>
  );
}
