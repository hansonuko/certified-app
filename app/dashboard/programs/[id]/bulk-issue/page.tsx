import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { BulkIssueForm } from './BulkIssueForm';

// /dashboard/programs/[id]/bulk-issue (docs/build-phases.md Phase 7,
// docs/blueprint.md §3.3B) — CSV cohort issuance. Same brand-setup gate as
// the single-entry issue page (app/dashboard/programs/[id]/issue) — a
// certificate can't render without a chosen template and signatory, and
// that's just as true issuing forty at once as issuing one.
export default async function BulkIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const [{ data: program }, { data: org }] = await Promise.all([
    supabase.from('training_programs').select('id, title').eq('id', id).eq('org_id', orgId).maybeSingle(),
    supabase
      .from('organizations')
      .select('brand_template_id, brand_signatory_name, brand_primary_color, certificate_credits')
      .eq('id', orgId)
      .single(),
  ]);

  if (!program) notFound();

  const brandReady = !!(org?.brand_template_id && org?.brand_signatory_name && org?.brand_primary_color);

  if (!brandReady) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-4 p-8">
        <h1 className="font-display text-2xl text-certified-navy">Bulk issue (CSV)</h1>
        <p className="text-certified-muted">
          Finish setting up your brand before issuing certificates — every certificate is rendered using it.
        </p>
        <Link href="/dashboard/brand" className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
          Go to brand setup
        </Link>
      </main>
    );
  }

  const credits = org?.certificate_credits ?? 0;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-2xl text-certified-navy">Bulk issue (CSV)</h1>
        <p className="text-certified-muted">For: {program.title}</p>
      </div>
      <p className={credits < 1 ? 'rounded-control border border-certified-warning bg-certified-surface-2 px-4 py-3 text-sm text-certified-ink' : 'text-xs text-certified-muted'}>
        {credits} certificate credit{credits === 1 ? '' : 's'} remaining — one is spent per row that succeeds. Rows
        beyond your balance will fail with a clear reason, not silently skip.{' '}
        <Link href="/dashboard/billing" className={credits < 1 ? 'font-semibold underline' : 'underline'}>
          Pay for certificates
        </Link>
        .
      </p>
      <BulkIssueForm programId={id} />
    </main>
  );
}
