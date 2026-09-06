'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  applicationApprovedEmail,
  applicationMoreInfoEmail,
  applicationRejectedEmail,
} from '@/lib/email/application-templates';
import { sendEmail } from '@/lib/email/send';

export type DecisionState = { error: string } | null;

type Decision = 'approved' | 'more_info_requested' | 'rejected';

/**
 * The three decision actions (docs/build-phases.md Phase 2). Each one:
 * 1. Re-checks can(role, 'review_applications') server-side — the page
 *    itself already redirects Finance away, but a stale client or a direct
 *    POST replay must still be refused here, not just at the page level
 *    (CLAUDE.md rule #9).
 * 2. Updates both organizations.status and applications.status — the
 *    applicant-facing /apply/status page reads organizations.status, so
 *    both have to move together or an approved org would still show
 *    "pending" to the applicant.
 * 3. Writes an AuditLog row via the service-role client — audit_log has no
 *    insert policy for anyone (supabase/migrations/0008), by design, so
 *    this is the one part of the decision that can't go through the
 *    regular RLS-respecting client.
 * 4. Sends the applicant a Resend email (mocked to console in dev, see
 *    lib/email/send.ts).
 */
async function decide(applicationId: string, decision: Decision, reason: string): Promise<DecisionState> {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'review_applications')) {
    return { error: "You don't have permission to review applications." };
  }
  if (decision !== 'approved' && !reason.trim()) {
    return { error: 'A reason is required for this decision.' };
  }

  const supabase = await createClient();

  const { data: application } = await supabase
    .from('applications')
    .select('id, org_id, decision_history, organizations!inner(display_name, owner_email)')
    .eq('id', applicationId)
    .maybeSingle();

  if (!application) return { error: 'Application not found.' };

  const org = Array.isArray(application.organizations) ? application.organizations[0] : application.organizations;
  const before = { status: decision === 'approved' ? 'pending' : undefined };
  const decisionEntry = { agent_id: userId, action: decision, reason: reason || undefined, at: new Date().toISOString() };
  const newHistory = [...((application.decision_history as unknown[]) ?? []), decisionEntry];

  const { error: orgError } = await supabase
    .from('organizations')
    .update({
      status: decision,
      ...(decision === 'approved' ? { approved_at: new Date().toISOString(), approved_by: userId } : {}),
    })
    .eq('id', application.org_id);

  if (orgError) return { error: `Could not update organization: ${orgError.message}` };

  const { error: applicationError } = await supabase
    .from('applications')
    .update({ status: decision, decision_history: newHistory })
    .eq('id', applicationId);

  if (applicationError) return { error: `Could not update application: ${applicationError.message}` };

  // audit_log has no RLS policy admitting anyone — service role only
  // (supabase/migrations/0008_audit_log.sql).
  const admin = createAdminClient();
  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: `application_${decision}`,
    target_type: 'applications',
    target_id: applicationId,
    before,
    after: { status: decision, reason: reason || null },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for application decision:', auditError.message);
  }

  if (org?.owner_email) {
    const template =
      decision === 'approved'
        ? applicationApprovedEmail(org.display_name)
        : decision === 'more_info_requested'
          ? applicationMoreInfoEmail(org.display_name, reason)
          : applicationRejectedEmail(org.display_name, reason);
    try {
      await sendEmail({ to: org.owner_email, ...template });
    } catch (err) {
      console.error('Failed to send decision email:', err);
    }
  }

  revalidatePath('/staff/applications');
  redirect('/staff/applications');
}

export async function approveApplication(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  return decide(formData.get('application_id') as string, 'approved', '');
}

export async function requestMoreInfo(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  return decide(formData.get('application_id') as string, 'more_info_requested', (formData.get('reason') as string) ?? '');
}

export async function rejectApplication(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  return decide(formData.get('application_id') as string, 'rejected', (formData.get('reason') as string) ?? '');
}
