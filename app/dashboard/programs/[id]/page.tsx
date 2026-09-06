import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { ProgramForm } from '../ProgramForm';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-certified-success/10 text-certified-success',
  revoked: 'bg-certified-danger/10 text-certified-danger',
  expired: 'bg-certified-warning/10 text-certified-warning',
};

// /dashboard/programs/[id] (docs/build-phases.md Phase 4) — program detail:
// edit the program's own fields, and the roster of certificates already
// issued under it. "Issue a certificate" is the entry point into the
// add-trainee flow (Phase 4's "Single Trainee Entry" path,
// docs/blueprint.md §3.3A); bulk/cohort entry is Phase 7.
export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: program } = await supabase
    .from('training_programs')
    .select('id, title, description, category, duration, start_date, end_date, certificate_validity_months')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!program) notFound();

  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, public_id, trainee_name_snapshot, status, issue_date, pdf_url')
    .eq('program_id', id)
    .order('created_at', { ascending: false });

  return (
    <main className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-certified-navy">{program.title}</h1>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/programs/${id}/bulk-issue`}
            className="rounded-control border border-certified-border px-4 py-2 text-sm text-certified-ink"
          >
            Bulk issue (CSV)
          </Link>
          <Link
            href={`/dashboard/programs/${id}/issue`}
            className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white"
          >
            Issue a certificate
          </Link>
        </div>
      </div>

      <section className="rounded-card border border-certified-border bg-certified-surface p-6">
        <h2 className="mb-4 font-display text-lg text-certified-navy">Certificates issued</h2>
        {!certificates || certificates.length === 0 ? (
          <p className="text-certified-muted">None yet — issue the first one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {certificates.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/certificates/${c.id}`}
                className="flex items-center justify-between rounded-control border border-certified-border px-4 py-3 text-sm transition hover:border-certified-gold"
              >
                <span className="text-certified-ink">{c.trainee_name_snapshot}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs text-certified-muted">{c.public_id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-certified-border bg-certified-surface p-6">
        <h2 className="mb-4 font-display text-lg text-certified-navy">Program details</h2>
        <ProgramForm
          mode="edit"
          programId={id}
          initial={{
            title: program.title,
            description: program.description ?? '',
            category: program.category ?? '',
            duration: program.duration ?? '',
            startDate: program.start_date ?? '',
            endDate: program.end_date ?? '',
            certificateValidityMonths: program.certificate_validity_months?.toString() ?? '',
          }}
        />
      </section>
    </main>
  );
}
