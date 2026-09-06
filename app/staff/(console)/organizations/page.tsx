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
  suspended: 'Suspended',
};

// /staff/organizations (docs/build-phases.md Phase 2.5, docs/sitemap.md §6).
// Admin + Account Manager get the full view built here; Finance has the
// view_organizations capability too (docs/roles-permissions.md §2, limited
// columns via organizations_finance_view) but Phase 2.5's own prompt defers
// building Finance's reduced-field UI for this route to Phase 9 — so Finance
// is excluded from this route for now, not because they lack the
// capability, but because this particular view hasn't been built for them
// yet (see lib/staff-nav.ts).
export default async function OrganizationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { role } = await requireStaffSession();
  if (!can(role, 'view_organizations') || role === 'finance') redirect('/staff');

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('organizations')
    .select('id, display_name, legal_name, type, status, rc_number, created_at')
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,legal_name.ilike.%${q}%`);
  }

  const { data: organizations } = await query;

  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Organizations</h1>

      <form className="max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-full rounded-control border border-certified-border px-3 py-2 text-sm"
        />
      </form>

      {!organizations || organizations.length === 0 ? (
        <p className="text-certified-muted">No organizations found.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Name</th>
              <th className="py-2">Type</th>
              <th className="py-2">RC/CAC</th>
              <th className="py-2">Status</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-certified-border">
                <td className="py-2">
                  <Link href={`/staff/organizations/${org.id}`} className="text-certified-navy underline">
                    {org.display_name}
                  </Link>
                </td>
                <td className="py-2">{org.type}</td>
                <td className="py-2">{org.rc_number ?? '—'}</td>
                <td className="py-2">{STATUS_LABEL[org.status] ?? org.status}</td>
                <td className="py-2">{new Date(org.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
