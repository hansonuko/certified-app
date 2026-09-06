import Link from 'next/link';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

// /dashboard/programs (docs/build-phases.md Phase 4) — list this org's
// training programs. A program is the unit certificates are issued under
// (docs/blueprint.md §3.3A); "Issue a certificate" from a program's detail
// page is the entry point into the add-trainee flow.
export default async function ProgramsPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: programs } = await supabase
    .from('training_programs')
    .select('id, title, category, duration, start_date, end_date, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-certified-navy">Programs</h1>
        <Link href="/dashboard/programs/new" className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
          New program
        </Link>
      </div>

      {!programs || programs.length === 0 ? (
        <div className="rounded-card border border-certified-border bg-certified-surface p-6">
          <p className="text-certified-muted">
            No programs yet. Create one to start adding trainees and issuing certificates.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/programs/${p.id}`}
              className="rounded-card border border-certified-border bg-certified-surface p-5 transition hover:border-certified-gold"
            >
              <p className="font-display text-lg text-certified-navy">{p.title}</p>
              <p className="text-sm text-certified-muted">
                {[p.category, p.duration].filter(Boolean).join(' · ') || 'No category or duration set'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
