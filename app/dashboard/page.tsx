import Link from 'next/link';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

// Overview (docs/sitemap.md §5, docs/build-phases.md Phase 3): issuance
// stats, active programs, recent certificates, pending leads, quick
// actions. Programs/Certificates/Messages don't have real functionality
// until Phases 4/6, so their counts are honestly zero right now rather
// than faked — this page queries the real tables, it just won't find
// anything yet for a freshly-approved org.
export default async function DashboardOverviewPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const [{ count: programCount }, { count: certificateCount }] = await Promise.all([
    supabase.from('training_programs').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ]);

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Overview</h1>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Active programs" value={programCount ?? 0} />
        <Stat label="Certificates issued" value={certificateCount ?? 0} />
        <Stat label="Pending leads" value={0} />
      </div>

      <div className="rounded-card border border-certified-border bg-certified-surface p-6">
        <h2 className="mb-3 font-display text-lg text-certified-navy">Quick actions</h2>
        <div className="flex gap-3">
          <Link href="/dashboard/brand" className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
            Set up your brand
          </Link>
        </div>
      </div>

      <div className="rounded-card border border-certified-border bg-certified-surface p-6">
        <h2 className="mb-2 font-display text-lg text-certified-navy">Recent activity</h2>
        <p className="text-certified-muted">
          Nothing yet — issuing certificates ships in a later phase (docs/build-phases.md Phase 4).
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-certified-border bg-certified-surface p-6">
      <p className="text-3xl font-semibold text-certified-navy">{value}</p>
      <p className="text-certified-muted">{label}</p>
    </div>
  );
}
