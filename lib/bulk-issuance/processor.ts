import type { SupabaseClient } from '@supabase/supabase-js';
import { issueCertificate, formatDateRangeLabel, addMonthsToDate } from '@/lib/certificates/issue';
import type { BrandConfig } from '@/lib/certificates/types';
import type { TemplateId } from '@/lib/certificates/templates';
import type { BulkRow } from './validate';

/**
 * Advances one bulk-issuance job by up to ROWS_PER_TICK rows (docs/build-
 * phases.md Phase 7 item 2). Called from two places — see migration 0022's
 * header comment for why a short lease guards against both running at once
 * on the same job:
 *
 * 1. The Vercel Cron-triggered route (app/api/cron/process-bulk-issuance) —
 *    the actual "queued job" mechanism docs/blueprint.md §8.3 asks for.
 * 2. The issuer's own job status page (app/dashboard/programs/[id]/bulk-
 *    issue/[jobId]/page.tsx), opportunistically, on each load/auto-refresh
 *    — a pragmatic free-tier addition, since Vercel's Hobby plan limits
 *    Cron to at most once a day, which would otherwise leave a queued batch
 *    sitting for a very long time with nobody driving it forward.
 *
 * Always uses the service-role client — a Cron invocation has no user
 * session at all, and even the page-view trigger runs the exact same
 * privileged path (trainee + certificate inserts, storage upload) rather
 * than a second, differently-permissioned one.
 */

const ROWS_PER_TICK = 3; // keeps one invocation comfortably inside a serverless function's execution budget
const LOCK_LEASE_MS = 45_000;

type JobRow = {
  id: string;
  org_id: string;
  program_id: string;
  status: string;
  rows: BulkRow[];
  row_results: RowResult[];
};

type RowResult = { rowIndex: number; status: 'succeeded' | 'failed'; error?: string; certificateId?: string; publicId?: string };

async function acquireLock(admin: SupabaseClient, jobId: string): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_LEASE_MS).toISOString();

  // Claims the lock only if it's unset or already expired — the `or()`
  // covers "never locked" and "lease expired," anything else means another
  // process currently holds it.
  const { data } = await admin
    .from('jobs')
    .update({ processing_lock_expires_at: expiresAt })
    .eq('id', jobId)
    .or(`processing_lock_expires_at.is.null,processing_lock_expires_at.lt.${now.toISOString()}`)
    .select('id')
    .maybeSingle();

  return !!data;
}

async function releaseLock(admin: SupabaseClient, jobId: string): Promise<void> {
  await admin.from('jobs').update({ processing_lock_expires_at: null }).eq('id', jobId);
}

export type AdvanceResult =
  | { outcome: 'locked' } // another process is currently advancing this job
  | { outcome: 'nothing_to_do' } // job doesn't exist, or is already completed
  | { outcome: 'advanced'; processedInThisTick: number; done: boolean }
  | { outcome: 'job_error'; message: string };

export async function advanceJob(admin: SupabaseClient, jobId: string): Promise<AdvanceResult> {
  const { data: job } = await admin
    .from('jobs')
    .select('id, org_id, program_id, status, rows, row_results')
    .eq('id', jobId)
    .maybeSingle<JobRow>();

  if (!job || job.status === 'completed') return { outcome: 'nothing_to_do' };

  if (!(await acquireLock(admin, jobId))) return { outcome: 'locked' };

  try {
    const allRows = job.rows;
    const doneIndices = new Set(job.row_results.map((r) => r.rowIndex));
    const remaining = allRows.filter((r) => !doneIndices.has(r.rowIndex));

    if (remaining.length === 0) {
      await admin.from('jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId);
      return { outcome: 'advanced', processedInThisTick: 0, done: true };
    }

    if (job.status === 'pending') {
      await admin.from('jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', jobId);
    }

    const [{ data: program }, { data: org }] = await Promise.all([
      admin
        .from('training_programs')
        .select('title, duration, start_date, end_date, certificate_validity_months')
        .eq('id', job.program_id)
        .single(),
      admin
        .from('organizations')
        .select(
          'owner_user_id, display_name, brand_logo_url, brand_primary_color, brand_signatory_name, brand_signatory_title, brand_signature_image_url, brand_template_id',
        )
        .eq('id', job.org_id)
        .single(),
    ]);

    if (!program || !org?.brand_template_id || !org.brand_signatory_name || !org.brand_primary_color) {
      await admin
        .from('jobs')
        .update({
          status: 'completed',
          error: 'Program or brand configuration is missing or incomplete — no rows in this batch were issued.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return { outcome: 'job_error', message: 'Program or brand configuration missing.' };
    }

    const brand: BrandConfig = {
      issuerName: org.display_name,
      logoUrl: org.brand_logo_url ?? undefined,
      primaryColor: org.brand_primary_color,
      signatoryName: org.brand_signatory_name,
      signatoryTitle: org.brand_signatory_title ?? '',
      signatureImageUrl: org.brand_signature_image_url ?? undefined,
    };
    const dateRangeLabel = formatDateRangeLabel(program.start_date, program.end_date);
    const batch = remaining.slice(0, ROWS_PER_TICK);
    const newResults: RowResult[] = [];

    for (const row of batch) {
      try {
        const { data: trainee, error: traineeError } = await admin
          .from('trainees')
          .insert({
            org_id: job.org_id,
            program_id: job.program_id,
            full_name: row.full_name,
            bio: row.bio,
            phone: row.phone,
            email: row.email,
            country: row.country,
            region: row.region,
            locality: row.locality,
          })
          .select('id')
          .single();

        if (traineeError || !trainee) {
          newResults.push({ rowIndex: row.rowIndex, status: 'failed', error: traineeError?.message ?? 'Could not create trainee record.' });
          continue;
        }

        const expiryDate = program.certificate_validity_months
          ? addMonthsToDate(row.completion_date, program.certificate_validity_months)
          : null;

        const result = await issueCertificate({
          storageClient: admin,
          adminClient: admin,
          ownerUserId: org.owner_user_id,
          orgId: job.org_id,
          programId: job.program_id,
          traineeId: trainee.id,
          traineeName: row.full_name,
          programTitle: program.title,
          durationLabel: program.duration ?? undefined,
          dateRangeLabel,
          completionDate: row.completion_date,
          grade: row.grade,
          expiryDate,
          brand,
          templateId: org.brand_template_id as TemplateId,
        });

        newResults.push(
          'error' in result
            ? { rowIndex: row.rowIndex, status: 'failed', error: result.error }
            : { rowIndex: row.rowIndex, status: 'succeeded', certificateId: result.certificateId, publicId: result.publicId },
        );
      } catch (err) {
        newResults.push({ rowIndex: row.rowIndex, status: 'failed', error: err instanceof Error ? err.message : 'Unknown error.' });
      }
    }

    const updatedResults = [...job.row_results, ...newResults];
    const succeeded = updatedResults.filter((r) => r.status === 'succeeded').length;
    const failed = updatedResults.filter((r) => r.status === 'failed').length;
    const done = updatedResults.length >= allRows.length;

    await admin
      .from('jobs')
      .update({
        row_results: updatedResults,
        processed_rows: updatedResults.length,
        succeeded_rows: succeeded,
        failed_rows: failed,
        status: done ? 'completed' : 'processing',
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq('id', jobId);

    return { outcome: 'advanced', processedInThisTick: batch.length, done };
  } finally {
    await releaseLock(admin, jobId);
  }
}

/** For the Cron route: the oldest job that still has work left. */
export async function pickNextPendingJobId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin
    .from('jobs')
    .select('id')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
