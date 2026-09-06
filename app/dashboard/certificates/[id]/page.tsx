import { notFound } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { RevokeForm } from './RevokeForm';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-certified-success/10 text-certified-success',
  revoked: 'bg-certified-danger/10 text-certified-danger',
  expired: 'bg-certified-warning/10 text-certified-warning',
};

// /dashboard/certificates/[id] (docs/build-phases.md Phase 4) — a single
// issued certificate: what it says, its public verification link, its PDF,
// and (if still active) the revoke action.
export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: cert } = await supabase
    .from('certificates')
    .select(
      'id, public_id, trainee_name_snapshot, program_title_snapshot, completion_date, issue_date, expiry_date, grade, status, pdf_url, revoked_reason, revoked_at',
    )
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!cert) notFound();

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${cert.public_id}`;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-certified-navy">{cert.trainee_name_snapshot}</h1>
        <span className={`rounded-full px-3 py-1 text-xs capitalize ${STATUS_STYLES[cert.status] ?? ''}`}>{cert.status}</span>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-card border border-certified-border bg-certified-surface p-5 text-sm">
        <Field label="Program" value={cert.program_title_snapshot} />
        <Field label="Certificate ID" value={cert.public_id} mono />
        <Field label="Completion date" value={cert.completion_date} />
        <Field label="Issue date" value={cert.issue_date} />
        {cert.grade ? <Field label="Grade / distinction" value={cert.grade} /> : null}
        {cert.expiry_date ? <Field label="Expires" value={cert.expiry_date} /> : null}
      </dl>

      {cert.status === 'revoked' ? (
        <div className="rounded-card border border-certified-danger/30 bg-certified-danger/5 p-4 text-sm text-certified-danger">
          Revoked{cert.revoked_at ? ` on ${cert.revoked_at.slice(0, 10)}` : ''}
          {cert.revoked_reason ? `: ${cert.revoked_reason}` : '.'}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm">
        <a href={verifyUrl} target="_blank" rel="noreferrer" className="text-certified-navy underline">
          Public verification page
        </a>
        {cert.pdf_url ? (
          <a href={cert.pdf_url} target="_blank" rel="noreferrer" className="text-certified-navy underline">
            Download PDF
          </a>
        ) : null}
      </div>

      {cert.status === 'active' ? <RevokeForm certificateId={cert.id} /> : null}
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-certified-muted">{label}</dt>
      <dd className={`text-certified-ink ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
