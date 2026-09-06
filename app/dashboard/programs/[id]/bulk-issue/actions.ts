'use server';

import { redirect } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { revalidateRows, type BulkRow } from '@/lib/bulk-issuance/validate';

export type BulkIssueFormState = { error: string } | null;

const MAX_ROWS_PER_BATCH = 500; // generous cap — protects the item-2 processor from an unbounded single job

/**
 * Enqueues a validated CSV batch (docs/build-phases.md Phase 7). Actual
 * certificate issuance doesn't happen here — this only creates the `jobs`
 * row (supabase/migrations/0021); a Cron-triggered processor (item 2) does
 * the real work of rendering PDFs and inserting `certificates` rows,
 * batch-at-a-time, so a large cohort never risks one request hitting
 * Vercel's function execution limit.
 *
 * Re-validates every row server-side (lib/bulk-issuance/validate.ts's
 * revalidateRows) rather than trusting the client's own filtering — the
 * `rows` field arrives as plain JSON in a hidden input, and nothing stops
 * a modified client (or a direct POST) from sending back rows that never
 * actually passed the browser-side check.
 */
export async function enqueueBulkIssuance(_prev: BulkIssueFormState, formData: FormData): Promise<BulkIssueFormState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const programId = formData.get('program_id') as string;
  const consentConfirmed = formData.get('consent_confirmed') === 'on';
  const rowsRaw = formData.get('rows') as string | null;

  if (!consentConfirmed) {
    return { error: 'You must confirm every trainee in this batch has consented to a public profile before issuing.' };
  }
  if (!rowsRaw) return { error: 'No rows were submitted.' };

  let parsedRows: BulkRow[];
  try {
    parsedRows = JSON.parse(rowsRaw);
    if (!Array.isArray(parsedRows)) throw new Error('not an array');
  } catch {
    return { error: 'Could not read the submitted rows — please re-upload your CSV.' };
  }

  if (parsedRows.length === 0) return { error: 'No rows to issue.' };
  if (parsedRows.length > MAX_ROWS_PER_BATCH) {
    return { error: `A single batch can have at most ${MAX_ROWS_PER_BATCH} rows — please split this into smaller files.` };
  }

  const revalidated = revalidateRows(parsedRows);
  const validRows = revalidated.filter((r) => r.errors.length === 0);
  if (validRows.length === 0) {
    return { error: 'None of the submitted rows are valid — please fix the errors shown and re-upload.' };
  }

  const { data: program } = await supabase
    .from('training_programs')
    .select('id')
    .eq('id', programId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (!program) return { error: 'Program not found.' };

  const { data: org } = await supabase
    .from('organizations')
    .select('brand_template_id, brand_signatory_name, brand_primary_color')
    .eq('id', orgId)
    .single();
  if (!org?.brand_template_id || !org.brand_signatory_name || !org.brand_primary_color) {
    return { error: 'Complete your brand setup before issuing certificates.' };
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      org_id: orgId,
      program_id: programId,
      rows: validRows,
      total_rows: validRows.length,
      consent_confirmed: consentConfirmed,
      status: 'pending',
    })
    .select('id')
    .single();

  if (jobError || !job) {
    return { error: `Could not queue the batch: ${jobError?.message ?? 'unknown error'}` };
  }

  redirect(`/dashboard/programs/${programId}/bulk-issue/${job.id}`);
}
