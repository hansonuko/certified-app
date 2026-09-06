'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { organizationSuspendedEmail, organizationReinstatedEmail } from '@/lib/email/organization-templates';
import { sendEmail } from '@/lib/email/send';

export type SuspendState = { error: string } | null;

/**
 * Suspend / reinstate an organization (docs/roles-permissions.md §2 —
 * "Suspend / reinstate an organization ✅ Admin ✅ Account Manager (with
 * reason, audit-logged)"). Not spelled out as its own bullet in Phase 2.5's
 * prompt the way revocations/moderation were, but it's the core
 * organization-management action the permission matrix requires and no
 * other phase claims it — grouped here under "organizations" per that
 * phase's own title.
 */
async function setSuspended(organizationId: string, suspend: boolean, reason: string): Promise<SuspendState> {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'suspend_organization')) {
    return { error: "You don't have permission to suspend or reinstate organizations." };
  }
  if (suspend && !reason.trim()) {
    return { error: 'A reason is required to suspend an organization.' };
  }

  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, display_name, owner_email, status')
    .eq('id', organizationId)
    .maybeSingle();

  if (!org) return { error: 'Organization not found.' };

  // Reinstating restores 'approved' — suspending anything that wasn't
  // approved (e.g. still pending) isn't a real-world case this UI exposes,
  // but guard it anyway rather than silently mangling an in-review org.
  if (!suspend && org.status !== 'suspended') {
    return { error: 'This organization is not currently suspended.' };
  }

  const newStatus = suspend ? 'suspended' : 'approved';
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ status: newStatus })
    .eq('id', organizationId);

  if (updateError) return { error: `Could not update organization: ${updateError.message}` };

  const admin = createAdminClient();
  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: suspend ? 'organization_suspended' : 'organization_reinstated',
    target_type: 'organizations',
    target_id: organizationId,
    before: { status: org.status },
    after: { status: newStatus, reason: reason || null },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for organization suspend/reinstate:', auditError.message);
  }

  if (org.owner_email) {
    const template = suspend
      ? organizationSuspendedEmail(org.display_name, reason)
      : organizationReinstatedEmail(org.display_name);
    try {
      await sendEmail({ to: org.owner_email, ...template });
    } catch (err) {
      console.error('Failed to send suspend/reinstate email:', err);
    }
  }

  revalidatePath(`/staff/organizations/${organizationId}`);
  return null;
}

export async function suspendOrganization(_prev: SuspendState, formData: FormData): Promise<SuspendState> {
  return setSuspended(formData.get('organization_id') as string, true, (formData.get('reason') as string) ?? '');
}

export async function reinstateOrganization(_prev: SuspendState, formData: FormData): Promise<SuspendState> {
  return setSuspended(formData.get('organization_id') as string, false, '');
}
