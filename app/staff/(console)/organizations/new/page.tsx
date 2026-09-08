import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { ManualOrgForm } from './ManualOrgForm';

// /staff/organizations/new (Admin + Account Manager) — staff-initiated
// organization entry, bypassing the applicant-submitted /apply flow.
// Scoped to Business/Training Centre only for now (see actions.ts's own
// header comment for why Individual Trainer isn't supported here yet).
export default async function NewOrganizationPage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'create_organization')) redirect('/staff');

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/staff/organizations" className="text-sm text-certified-navy underline">
          ← Organizations
        </Link>
        <h1 className="font-display text-2xl text-certified-navy">Add an organization</h1>
        <p className="text-certified-muted">
          Business/Training Centre only. Creates the organization already approved — no separate review step, since
          you&apos;re both submitting and approving here.
        </p>
      </div>

      <ManualOrgForm />
    </main>
  );
}
