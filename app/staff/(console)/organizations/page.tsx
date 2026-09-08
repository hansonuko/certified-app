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

// /staff/organizations (docs/build-phases.md Phase 2.5 + Phase 9, docs/
// sitemap.md §6). Admin + Account Manager get the full view (name, RC/CAC,
// KYC-adjacent fields); Finance gets the reduced view promised back in
// Phase 2.5 — "limited columns: name, plan, status, usage" (docs/roles-
// permissions.md §2) — sourced from organizations_finance_view
// (supabase/migrations/0009, extended by 0025 for created_at), which
// self-filters on is_finance() or is_admin() in its own definition, same
// pattern as every other finance-view read in this codebase (lib/reports/
// finance-data.ts). Both branches share the same route and nav item now;
// only the query and the rendered columns differ by role.
export default async function OrganizationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { role } = await requireStaffSession();
  if (!can(role, 'view_organizations')) redirect('/staff');

  const { q } = await searchParams;

  if (role === 'finance') {
    return <FinanceOrganizationsList q={q} />;
  }

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

      <SearchForm q={q} />

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

// Finance's reduced view (docs/roles-permissions.md §2: "limited columns:
// name, plan, status, usage" — never KYC fields or owner contact info).
// Search is by name only, matching the columns this view actually has (no
// legal_name here — that's a KYC-adjacent field the finance view never
// selected in the first place, supabase/migrations/0009).
async function FinanceOrganizationsList({ q }: { q?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from('organizations_finance_view')
    .select('id, name, plan, status, created_at, certificates_issued')
    .order('created_at', { ascending: false });

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: organizations } = await query;

  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Organizations</h1>

      <SearchForm q={q} />

      {!organizations || organizations.length === 0 ? (
        <p className="text-certified-muted">No organizations found.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Name</th>
              <th className="py-2">Plan</th>
              <th className="py-2">Status</th>
              <th className="py-2">Created</th>
              <th className="py-2">Certificates issued</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-certified-border">
                <td className="py-2">
                  <Link href={`/staff/organizations/${org.id}`} className="text-certified-navy underline">
                    {org.name}
                  </Link>
                </td>
                <td className="py-2">{org.plan ?? 'Free'}</td>
                <td className="py-2">{STATUS_LABEL[org.status] ?? org.status}</td>
                <td className="py-2">{new Date(org.created_at).toLocaleDateString()}</td>
                <td className="py-2">{org.certificates_issued}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function SearchForm({ q }: { q?: string }) {
  return (
    <form className="max-w-sm">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search by name…"
        className="w-full rounded-control border border-certified-border px-3 py-2 text-sm"
      />
    </form>
  );
}
