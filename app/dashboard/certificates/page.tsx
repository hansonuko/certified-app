import Link from 'next/link';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-certified-success/10 text-certified-success',
  revoked: 'bg-certified-danger/10 text-certified-danger',
  expired: 'bg-certified-warning/10 text-certified-warning',
};

// /dashboard/certificates (docs/build-phases.md Phase 4) — every certificate
// this org has issued, across all programs. certificates_owner_select
// (supabase/migrations/0007) scopes this to the org automatically.
export default async function CertificatesPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: certificates } = await supabase
    .from('certificates')
    .select('id, public_id, trainee_name_snapshot, program_title_snapshot, status, issue_date')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Certificates</h1>

      {!certificates || certificates.length === 0 ? (
        <div className="rounded-card border border-certified-border bg-certified-surface p-6">
          <p className="text-certified-muted">
            None issued yet — issue your first certificate from a program&apos;s page.
          </p>
          <Link href="/dashboard/programs" className="mt-3 inline-block text-sm text-certified-navy underline">
            Go to programs
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {certificates.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/certificates/${c.id}`}
              className="flex items-center justify-between rounded-card border border-certified-border bg-certified-surface p-4 transition hover:border-certified-gold"
            >
              <span>
                <span className="block text-certified-ink">{c.trainee_name_snapshot}</span>
                <span className="block text-sm text-certified-muted">{c.program_title_snapshot}</span>
              </span>
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
    </main>
  );
}
