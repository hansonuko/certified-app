import { redirect } from 'next/navigation';
import { requireIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

type DecisionEntry = { agent_id: string; action: string; reason?: string; at: string };

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  more_info_requested: 'More information requested',
  approved: 'Approved',
  rejected: 'Not approved',
};

// docs/sitemap.md: /apply/status — reflects the applicant's current state
// with any agent comments visible (docs/build-phases.md Phase 1).
export default async function ApplyStatusPage() {
  const { userId } = await requireIssuerSession();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, display_name, status')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (!org) redirect('/apply');
  // Phase 3 gave approved issuers a real dashboard — no reason to stop here
  // first every time they log in (this page's own "check back soon" copy
  // below was written before that existed).
  if (org.status === 'approved') redirect('/dashboard');

  const { data: application } = await supabase
    .from('applications')
    .select('status, agent_notes, decision_history')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const decisionHistory = (application?.decision_history as DecisionEntry[] | null) ?? [];
  const latestDecision = decisionHistory[decisionHistory.length - 1];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">{org.display_name}</h1>
      <p className="text-lg text-certified-ink">
        Status: <span className="font-semibold">{STATUS_LABEL[org.status] ?? org.status}</span>
      </p>

      {org.status === 'more_info_requested' && latestDecision?.reason ? (
        <div className="rounded-card border border-certified-warning bg-certified-surface-2 p-4 text-sm">
          <p className="font-semibold text-certified-warning">Agent comment</p>
          <p className="mt-1 text-certified-ink">{latestDecision.reason}</p>
        </div>
      ) : null}

      {org.status === 'rejected' ? (
        <div className="rounded-card border border-certified-danger bg-certified-surface-2 p-4 text-sm">
          <p className="font-semibold text-certified-danger">Reason</p>
          <p className="mt-1 text-certified-ink">{latestDecision?.reason ?? 'No reason provided.'}</p>
          <p className="mt-3 text-certified-muted">
            You can reapply immediately — there is no cooldown period.
          </p>
        </div>
      ) : null}

      {org.status === 'pending' ? (
        <p className="text-certified-muted">
          Your application is in the review queue. We&apos;ll notify you once an agent has looked at it.
        </p>
      ) : null}
    </main>
  );
}
