import { notFound } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

// Bulk issuance job status (docs/build-phases.md Phase 7). Item 1 only
// enqueues jobs (app/dashboard/programs/[id]/bulk-issue/actions.ts) — the
// Cron-triggered processor that actually works through `rows` and fills in
// `row_results` is item 2, so this page is a plain read-only status view
// for now rather than a live progress bar; refreshing shows whatever the
// processor has gotten to once it exists.
export default async function BulkIssueJobPage({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { jobId } = await params;
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('id, status, total_rows, processed_rows, succeeded_rows, failed_rows, row_results, error, created_at, completed_at')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!job) notFound();

  const rowResults = (job.row_results as { rowIndex: number; status: string; error?: string }[] | null) ?? [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="font-display text-2xl text-certified-navy">Bulk issuance batch</h1>

      <div className="rounded-card border border-certified-border bg-certified-surface p-5">
        <p className="text-certified-ink">
          Status: <span className="font-semibold capitalize">{job.status}</span>
        </p>
        <p className="text-sm text-certified-muted">
          {job.total_rows} row{job.total_rows === 1 ? '' : 's'} queued · {job.processed_rows} processed ·{' '}
          {job.succeeded_rows} succeeded · {job.failed_rows} failed
        </p>
        {job.status === 'pending' ? (
          <p className="mt-2 text-sm text-certified-muted">
            Queued — processing happens automatically in the background. Refresh this page to check progress.
          </p>
        ) : null}
        {job.error ? <p className="mt-2 text-sm text-certified-danger">{job.error}</p> : null}
      </div>

      {rowResults.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-certified-navy">Row results</h2>
          {rowResults.map((r) => (
            <div key={r.rowIndex} className="flex items-center justify-between rounded-control border border-certified-border px-3 py-2 text-sm">
              <span>Row {r.rowIndex}</span>
              <span className={r.status === 'succeeded' ? 'text-certified-success' : 'text-certified-danger'}>
                {r.status === 'succeeded' ? 'Issued' : `Failed: ${r.error ?? 'unknown error'}`}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
