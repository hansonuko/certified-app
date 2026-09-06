import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  more_info_requested: 'More info requested',
  approved: 'Approved',
  rejected: 'Rejected',
};

// Review queue (docs/build-phases.md Phase 2, docs/sitemap.md §6) —
// Admin + Account Manager only. Finance hitting this URL directly gets
// redirected, not just a hidden nav link (the Phase 2 prompt's own closing
// check: "Confirm a Finance-role test account gets a 403/redirect if it
// hits /staff/applications directly by URL").
export default async function ApplicationsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ resubmitted?: string }>;
}) {
  const { role } = await requireStaffSession();
  if (!can(role, 'review_applications')) redirect('/staff');

  const { resubmitted } = await searchParams;
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from('applications')
    .select('id, status, created_at, org_id, organizations!inner(display_name, type)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // "Resubmitted" = this org has more than one Application row on file —
  // i.e. a prior attempt exists (docs/blueprint.md §3.1: no cooldown,
  // resubmission re-enters the queue, but the full prior-attempt history
  // stays visible to reviewing agents).
  const orgIds = [...new Set((applications ?? []).map((a) => a.org_id))];
  const { data: allApplications } = orgIds.length
    ? await supabase.from('applications').select('org_id').in('org_id', orgIds)
    : { data: [] };
  const resubmittedOrgIds = new Set(
    Object.entries(
      (allApplications ?? []).reduce<Record<string, number>>((acc, a) => {
        acc[a.org_id] = (acc[a.org_id] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .map(([orgId]) => orgId),
  );

  const rows = (applications ?? []).filter((a) =>
    resubmitted === '1' ? resubmittedOrgIds.has(a.org_id) : true,
  );

  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Applications</h1>
      <div className="flex gap-3 text-sm">
        <Link href="/staff/applications" className={resubmitted !== '1' ? 'font-semibold' : 'text-certified-muted'}>
          All pending
        </Link>
        <Link
          href="/staff/applications?resubmitted=1"
          className={resubmitted === '1' ? 'font-semibold' : 'text-certified-muted'}
        >
          Resubmitted only
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-certified-muted">No applications waiting on a decision.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Organization</th>
              <th className="py-2">Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">Submitted</th>
              <th className="py-2">Resubmitted?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((application) => {
              const org = Array.isArray(application.organizations)
                ? application.organizations[0]
                : application.organizations;
              return (
                <tr key={application.id} className="border-b border-certified-border">
                  <td className="py-2">
                    <Link href={`/staff/applications/${application.id}`} className="text-certified-navy underline">
                      {org?.display_name}
                    </Link>
                  </td>
                  <td className="py-2">{org?.type}</td>
                  <td className="py-2">{STATUS_LABEL[application.status] ?? application.status}</td>
                  <td className="py-2">{new Date(application.created_at).toLocaleDateString()}</td>
                  <td className="py-2">{resubmittedOrgIds.has(application.org_id) ? 'Yes' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
