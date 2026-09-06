import { notFound } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { advanceJob } from '@/lib/bulk-issuance/processor';
import { AutoRefresh } from '@/components/AutoRefresh';

// Bulk issuance job status (docs/build-phases.md Phase 7). Owns two jobs:
// showing progress, and — opportunistically — driving that progress
// forward. Every load of this page advances the job by one tick
// (lib/bulk-issuance/processor.ts's advanceJob, service-role, lock-guarded
// against the Cron route also touching the same job) before reading and
// rendering the fresh state, and AutoRefresh keeps that happening every
// few seconds while the issuer has the page open. This isn't replacing the
// Cron processor (app/api/cron/process-bulk-issuance) — it's a pragmatic
// complement to it: Vercel's Hobby tier limits Cron to once a day, which
// would otherwise leave a queued batch sitting for a very long time with
// nobody driving it if the issuer isn't watching this page.
export default async function BulkIssueJobPage({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { jobId } = await params;
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: ownedJob } = await supabase.from('jobs').select('id').eq('id', jobId).eq('org_id', orgId).maybeSingle();
  if (!ownedJob) notFound();

  await advanceJob(createAdminClient(), jobId);

  const { data: job } = await supabase
    .from('jobs')
    .select('id, status, total_rows, processed_rows, succeeded_rows, failed_rows, row_results, error, created_at, completed_at')
    .eq('id', jobId)
    .single();

  if (!job) notFound();

  const rowResults = (job.row_results as { rowIndex: number; status: string; error?: string }[] | null) ?? [];
  const isDone = job.status === 'completed';

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
      <AutoRefresh active={!isDone} />
      <h1 className="font-display text-2xl text-certified-navy">Bulk issuance batch</h1>

      <div className="rounded-card border border-certified-border bg-certified-surface p-5">
        <p className="text-certified-ink">
          Status: <span className="font-semibold capitalize">{job.status}</span>
        </p>
        <p className="text-sm text-certified-muted">
          {job.total_rows} row{job.total_rows === 1 ? '' : 's'} queued · {job.processed_rows} processed ·{' '}
          {job.succeeded_rows} succeeded · {job.failed_rows} failed
        </p>
        {!isDone ? (
          <p className="mt-2 text-sm text-certified-muted">
            Processing automatically — this page updates itself every few seconds. You can close it and come back
            later; a background job keeps working through the batch either way.
          </p>
        ) : (
          <p className="mt-2 text-sm text-certified-success">Done.</p>
        )}
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
