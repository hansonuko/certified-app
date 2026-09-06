import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { DecisionForms } from './DecisionForms';

type SubmittedData = {
  training_fields?: string;
  training_description?: string;
};

// Application detail + decision (docs/build-phases.md Phase 2, docs/sitemap.md
// §6) — Admin + Account Manager only. Signed URLs for documents, never
// public ones (docs/build-phases.md Phase 2's own wording); for Individual
// Trainers, the signed declaration text + timestamp per docs/declaration-
// form.md.
export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireStaffSession();
  if (!can(role, 'review_applications')) redirect('/staff');

  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from('applications')
    .select('id, status, submitted_data, agent_notes, decision_history, created_at, organizations!inner(*)')
    .eq('id', id)
    .maybeSingle();

  if (!application) notFound();

  const org = Array.isArray(application.organizations) ? application.organizations[0] : application.organizations;
  const submittedData = (application.submitted_data ?? {}) as SubmittedData;

  const [identificationUrl, proofOfOperationUrl] = await Promise.all([
    org.owner_id_document_url
      ? supabase.storage.from('application-documents').createSignedUrl(org.owner_id_document_url, 600)
      : Promise.resolve({ data: null }),
    org.proof_of_operation_url
      ? supabase.storage.from('application-documents').createSignedUrl(org.proof_of_operation_url, 600)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-certified-navy">{org.display_name}</h1>
        <p className="text-certified-muted">{org.type === 'business' ? 'Business / Training Centre' : 'Individual Trainer'}</p>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-card border border-certified-border p-6 text-sm">
        <Field label="Legal name" value={org.legal_name} />
        <Field label="RC/CAC number" value={org.rc_number ?? '—'} />
        <Field label="Address" value={[org.address_street, org.address_locality, org.address_region, org.address_country].filter(Boolean).join(', ')} />
        <Field label="Expected trainee volume" value={org.trainee_volume_band ?? '—'} />
        <Field label="Owner" value={org.owner_full_name} />
        <Field label="Phone" value={org.owner_phone} />
        <Field label="Email" value={org.owner_email} />
        <Field label="Field(s) of training" value={submittedData.training_fields ?? '—'} />
        <div className="col-span-2">
          <Field label="Description" value={submittedData.training_description ?? '—'} />
        </div>
      </section>

      <section className="rounded-card border border-certified-border p-6 text-sm">
        <h2 className="mb-3 font-display text-lg text-certified-navy">Documents</h2>
        <div className="flex flex-col gap-2">
          <DocLink label="Identification document" url={identificationUrl.data?.signedUrl} />
          <DocLink label="Proof of operation (CAC certificate)" url={proofOfOperationUrl.data?.signedUrl} />
        </div>
      </section>

      {org.type === 'individual' && org.owner_declaration_signed_at ? (
        <section className="rounded-card border border-certified-border p-6 text-sm">
          <h2 className="mb-3 font-display text-lg text-certified-navy">Declaration</h2>
          <p>Signed: {new Date(org.owner_declaration_signed_at).toLocaleString()}</p>
          <p>Version: {org.declaration_version ?? '—'}</p>
          <p>Submission IP: {org.declaration_submission_ip ?? '—'}</p>
          <p className="mt-2 text-certified-muted">Full text: docs/declaration-form.md</p>
        </section>
      ) : null}

      {application.decision_history && (application.decision_history as unknown[]).length > 0 ? (
        <section className="rounded-card border border-certified-border p-6 text-sm">
          <h2 className="mb-3 font-display text-lg text-certified-navy">Prior decisions</h2>
          <pre className="overflow-x-auto text-xs text-certified-muted">
            {JSON.stringify(application.decision_history, null, 2)}
          </pre>
        </section>
      ) : null}

      <DecisionForms applicationId={application.id} />
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-certified-muted">{label}</p>
      <p className="text-certified-ink">{value}</p>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <span className="text-certified-muted">{label}: </span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-certified-navy underline">
          View (link expires in 10 min)
        </a>
      ) : (
        <span className="text-certified-muted">not provided</span>
      )}
    </div>
  );
}
