import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { IssueForm } from './IssueForm';

// /dashboard/programs/[id]/issue (docs/build-phases.md Phase 4, "Single
// Trainee Entry" — docs/blueprint.md §3.3A): add a trainee and generate
// their certificate in one step. Gated on brand setup being complete
// (docs/build-phases.md Phase 3) — a certificate can't render without a
// chosen template and signatory, so this page checks that up front rather
// than letting the issuer fill the whole form and fail at the end.
export default async function IssueCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const [{ data: program }, { data: org }] = await Promise.all([
    supabase
      .from('training_programs')
      .select('id, title')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle(),
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
        <h1 className="font-display text-2xl text-certified-navy">Issue a certificate</h1>
        <p className="text-certified-muted">
          Finish setting up your brand (logo, color, signatory, template) before issuing your first certificate —
          every certificate is rendered using it.
        </p>
        <Link href="/dashboard/brand" className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
          Go to brand setup
        </Link>
      </main>
    );
  }

  const credits = org?.certificate_credits ?? 0;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Issue a certificate</h1>
      <p className="text-certified-muted">For: {program.title}</p>
      {credits < 1 ? (
        <p className="rounded-control border border-certified-warning bg-certified-surface-2 px-4 py-3 text-sm text-certified-ink">
          You have 0 certificate credits — issuing will fail until you{' '}
          <Link href="/dashboard/billing" className="underline">
            top up
          </Link>
          . One credit is spent per certificate issued.
        </p>
      ) : (
        <p className="text-xs text-certified-muted">
          {credits} certificate credit{credits === 1 ? '' : 's'} remaining —{' '}
          <Link href="/dashboard/billing" className="underline">
            manage billing
          </Link>
          .
        </p>
      )}
      <IssueForm programId={id} />
    </main>
  );
}
