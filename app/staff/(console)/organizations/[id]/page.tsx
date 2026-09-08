import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { SuspendForm } from './SuspendForm';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  more_info_requested: 'More info requested',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

// /staff/organizations/[id] — full view for Admin/Account Manager (docs/
// build-phases.md Phase 2.5); Finance's reduced-field view (Phase 9) below
// reads organizations_finance_view instead of the base table — never the
// KYC fields (owner_id_document_url, owner_nin) or contact fields
// (owner_phone, owner_email) that view never exposed in the first place
// (supabase/migrations/0009), and no suspend action (Finance doesn't have
// suspend_organization in the matrix either).
export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireStaffSession();
  if (!can(role, 'view_organizations')) redirect('/staff');

  const { id } = await params;

  if (role === 'finance') {
    return <FinanceOrganizationDetail id={id} />;
  }

  const supabase = await createClient();

  const { data: org } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (!org) notFound();

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
        <p className="text-certified-muted">
          {org.type === 'business' ? 'Business / Training Centre' : 'Individual Trainer'} · {org.status}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-card border border-certified-border p-6 text-sm">
        <Field label="Legal name" value={org.legal_name} />
        <Field label="RC/CAC number" value={org.rc_number ?? '—'} />
        <Field label="Address" value={[org.address_street, org.address_locality, org.address_region, org.address_country].filter(Boolean).join(', ') || '—'} />
        <Field label="Expected trainee volume" value={org.trainee_volume_band ?? '—'} />
        <Field label="Owner" value={org.owner_full_name} />
        <Field label="Phone" value={org.owner_phone} />
        <Field label="Email" value={org.owner_email} />
        <Field label="Approved" value={org.approved_at ? new Date(org.approved_at).toLocaleString() : '—'} />
      </section>

      <section className="rounded-card border border-certified-border p-6 text-sm">
        <h2 className="mb-3 font-display text-lg text-certified-navy">Documents</h2>
        <div className="flex flex-col gap-2">
          <DocLink label="Identification document" url={identificationUrl.data?.signedUrl} />
          <DocLink label="Proof of operation (CAC certificate)" url={proofOfOperationUrl.data?.signedUrl} />
        </div>
      </section>

      {can(role, 'suspend_organization') && (org.status === 'approved' || org.status === 'suspended') ? (
        <SuspendForm organizationId={org.id} status={org.status} />
      ) : null}
    </main>
  );
}

async function FinanceOrganizationDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from('organizations_finance_view')
    .select('id, name, plan, status, created_at, certificates_issued')
    .eq('id', id)
    .maybeSingle();
  if (!org) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-certified-navy">{org.name}</h1>
        <p className="text-certified-muted">{STATUS_LABEL[org.status] ?? org.status}</p>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-card border border-certified-border p-6 text-sm">
        <Field label="Plan" value={org.plan ?? 'Free'} />
        <Field label="Joined" value={new Date(org.created_at).toLocaleDateString()} />
        <Field label="Certificates issued" value={String(org.certificates_issued)} />
      </section>
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
