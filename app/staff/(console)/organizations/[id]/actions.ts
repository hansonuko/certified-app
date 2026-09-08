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

/**
 * Reassign an organization to a different Account Manager (supabase/
 * migrations/0027's "territory" model) — Admin only, per the "the admin
 * can still access and also manage all" requirement this whole feature
 * was scoped around. Doesn't need the service-role client for the update
 * itself: is_admin() always passes organizations_staff_all's USING/WITH
 * CHECK regardless of assigned_account_manager_id, same as every other
 * Admin action on this page.
 */
export async function reassignAccountManager(_prev: SuspendState, formData: FormData): Promise<SuspendState> {
  const organizationId = formData.get('organization_id') as string;
  const newManagerId = (formData.get('account_manager_id') as string) || null;
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'reassign_organization_account_manager')) {
    return { error: "You don't have permission to reassign an organization's Account Manager." };
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('id, display_name, assigned_account_manager_id')
    .eq('id', organizationId)
    .maybeSingle();
  if (!org) return { error: 'Organization not found.' };

  if (newManagerId) {
    const admin = createAdminClient();
    const { data: manager } = await admin
      .from('admin_users')
      .select('id, role, status')
      .eq('id', newManagerId)
      .maybeSingle();
    if (!manager || manager.role !== 'account_manager' || manager.status !== 'active') {
      return { error: 'That account is not an active Account Manager.' };
    }
  }

  const { error: updateError } = await supabase
    .from('organizations')
    .update({ assigned_account_manager_id: newManagerId })
    .eq('id', organizationId);
  if (updateError) return { error: `Could not reassign: ${updateError.message}` };

  const admin = createAdminClient();
  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'organization_reassigned',
    target_type: 'organizations',
    target_id: organizationId,
    before: { assigned_account_manager_id: org.assigned_account_manager_id },
    after: { assigned_account_manager_id: newManagerId },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for organization reassignment:', auditError.message);
  }

  revalidatePath(`/staff/organizations/${organizationId}`);
  return null;
}

// For the reassignment dropdown — Admin-only page, so the service-role
// client is fine here (admin_users has no policy granting non-Admin roles
// a general SELECT anyway, see supabase/migrations/0002).
export async function getActiveAccountManagers() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('admin_users')
    .select('id, name')
    .eq('role', 'account_manager')
    .eq('status', 'active')
    .order('name');
  return data ?? [];
}
