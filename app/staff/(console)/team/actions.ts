'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { can, type StaffRole } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  staffInviteEmail,
  staffSuspendedEmail,
  staffReinstatedEmail,
  staffDeactivatedEmail,
} from '@/lib/email/staff-templates';
import { sendEmail } from '@/lib/email/send';

export type TeamActionState = { error: string } | null;

const VALID_ROLES: ReadonlyArray<StaffRole> = ['admin', 'account_manager', 'finance'];

function generateTempPassword(): string {
  // base64url — letters/digits/-/_ only, no quoting issues in the email body.
  // Not meant to be memorized: the invite email points staff at "Forgot
  // password" to set their own after first sign-in.
  return randomBytes(21).toString('base64url');
}

/**
 * Invite a new staff account (docs/build-phases.md Phase 2.75, docs/roles-
 * permissions.md §2 "Manage staff accounts"). Mirrors scripts/bootstrap-
 * admin.ts's create-then-insert-then-audit sequence, just reachable from
 * the console instead of a one-time CLI script, and gated behind an
 * existing Admin's session rather than the zero-count bootstrap check.
 *
 * Creating another Admin additionally requires `manage_admin_accounts` and a
 * confirmed checkbox from the form ("given the power involved" per Phase
 * 2.75's own prompt) — currently the same admin-only gate as
 * `manage_staff_accounts` in the matrix, but kept as a separate check so the
 * two don't silently diverge if the matrix ever splits them.
 */
export async function inviteStaffMember(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const { userId, role: actingRole } = await requireStaffSession();
  if (!can(actingRole, 'manage_staff_accounts')) {
    return { error: "You don't have permission to add staff accounts." };
  }

  const name = ((formData.get('name') as string) ?? '').trim();
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();
  const role = formData.get('role') as string;
  const confirmedAdmin = formData.get('confirm_admin') === 'true';

  if (!name || !email) return { error: 'Name and email are required.' };
  if (!VALID_ROLES.includes(role as StaffRole)) return { error: 'Invalid role.' };
  if (role === 'admin') {
    if (!can(actingRole, 'manage_admin_accounts')) {
      return { error: "You don't have permission to create another Admin account." };
    }
    if (!confirmedAdmin) {
      return { error: 'Confirm the checkbox to create an Admin account — this grants full platform power.' };
    }
  }

  const admin = createAdminClient();

  const { data: existing } = await admin.from('admin_users').select('id').eq('email', email).maybeSingle();
  if (existing) return { error: 'A staff account with this email already exists.' };

  const tempPassword = generateTempPassword();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { user_type: 'staff', full_name: name },
  });

  if (authError || !authUser.user) {
    return { error: `Could not create the account: ${authError?.message ?? 'unknown error'}` };
  }

  const { error: insertError } = await admin.from('admin_users').insert({
    id: authUser.user.id,
    name,
    email,
    role,
    status: 'active',
    invited_by: userId,
  });

  if (insertError) {
    // Don't leave a dangling Auth user with no admin_users row behind
    // (same rollback the bootstrap script does on this exact failure).
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: `Could not create the staff record: ${insertError.message}` };
  }

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'staff_account_invited',
    target_type: 'admin_users',
    target_id: authUser.user.id,
    before: null,
    after: { name, email, role, status: 'active' },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for staff invite:', auditError.message);
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendEmail({ to: email, ...staffInviteEmail(name, role, tempPassword, appUrl) });
  } catch (err) {
    console.error('Failed to send staff invite email:', err);
  }

  revalidatePath('/staff/team');
  return null;
}

/**
 * Change an existing staff member's role. Changing to/from Admin requires
 * `manage_admin_accounts`; changing between Account Manager and Finance
 * only requires `manage_staff_accounts` (both admin-only today, per the
 * matrix, so this distinction is forward-looking rather than load-bearing
 * yet). An Admin can't change their own role — that's a lockout risk with
 * no upside, and the matrix's own "4-eyes recommended" note for touching
 * another Admin's role implies self-service wasn't the intent either.
 */
export async function changeStaffRole(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const { userId, role: actingRole } = await requireStaffSession();
  const targetId = formData.get('staff_id') as string;
  const newRole = formData.get('role') as string;
  const confirmedAdmin = formData.get('confirm_admin') === 'true';

  if (!can(actingRole, 'manage_staff_accounts')) {
    return { error: "You don't have permission to change staff roles." };
  }
  if (!VALID_ROLES.includes(newRole as StaffRole)) return { error: 'Invalid role.' };
  if (targetId === userId) return { error: "You can't change your own role — ask another Admin." };

  const admin = createAdminClient();
  const { data: target } = await admin.from('admin_users').select('id, role, name').eq('id', targetId).maybeSingle();
  if (!target) return { error: 'Staff account not found.' };

  if ((target.role === 'admin' || newRole === 'admin') && !can(actingRole, 'manage_admin_accounts')) {
    return { error: "You don't have permission to change an Admin account's role." };
  }
  if (newRole === 'admin' && target.role !== 'admin' && !confirmedAdmin) {
    return { error: 'Confirm the checkbox to promote this account to Admin — this grants full platform power.' };
  }

  const { error: updateError } = await admin.from('admin_users').update({ role: newRole }).eq('id', targetId);
  if (updateError) return { error: `Could not update role: ${updateError.message}` };

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'staff_role_changed',
    target_type: 'admin_users',
    target_id: targetId,
    before: { role: target.role },
    after: { role: newRole },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for staff role change:', auditError.message);
  }

  revalidatePath('/staff/team');
  return null;
}

async function setStaffStatus(targetId: string, suspend: boolean): Promise<TeamActionState> {
  const { userId, role: actingRole } = await requireStaffSession();
  if (!can(actingRole, 'manage_staff_accounts')) {
    return { error: "You don't have permission to suspend or reinstate staff accounts." };
  }
  if (targetId === userId) return { error: "You can't suspend your own account — ask another Admin." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('admin_users')
    .select('id, role, status, name, email')
    .eq('id', targetId)
    .maybeSingle();
  if (!target) return { error: 'Staff account not found.' };

  if (target.role === 'admin' && !can(actingRole, 'manage_admin_accounts')) {
    return { error: "You don't have permission to suspend or reinstate an Admin account." };
  }
  if (suspend && target.status === 'suspended') return { error: 'This account is already suspended.' };
  if (!suspend && target.status !== 'suspended') return { error: 'This account is not currently suspended.' };

  const newStatus = suspend ? 'suspended' : 'active';
  const { error: updateError } = await admin.from('admin_users').update({ status: newStatus }).eq('id', targetId);
  if (updateError) return { error: `Could not update status: ${updateError.message}` };

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: suspend ? 'staff_account_suspended' : 'staff_account_reinstated',
    target_type: 'admin_users',
    target_id: targetId,
    before: { status: target.status },
    after: { status: newStatus },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for staff suspend/reinstate:', auditError.message);
  }

  try {
    const template = suspend ? staffSuspendedEmail(target.name) : staffReinstatedEmail(target.name);
    await sendEmail({ to: target.email, ...template });
  } catch (err) {
    console.error('Failed to send staff suspend/reinstate email:', err);
  }

  revalidatePath('/staff/team');
  return null;
}

export async function suspendStaffMember(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  return setStaffStatus(formData.get('staff_id') as string, true);
}

export async function reinstateStaffMember(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  return setStaffStatus(formData.get('staff_id') as string, false);
}

/**
 * Permanently deactivate a staff account — a one-way door, unlike Suspend/
 * Reinstate above. No `reinstateFromDeactivated` action exists on purpose:
 * getting access back after deactivation means a fresh invite from an
 * Admin, not a click in this UI. Requires the same confirmed-checkbox
 * pattern as promoting/creating an Admin (inviteStaffMember,
 * changeStaffRole) since it's similarly consequential and hard to walk
 * back.
 */
export async function deactivateStaffMember(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const targetId = formData.get('staff_id') as string;
  const confirmed = formData.get('confirm_deactivate') === 'true';
  const { userId, role: actingRole } = await requireStaffSession();

  if (!can(actingRole, 'manage_staff_accounts')) {
    return { error: "You don't have permission to deactivate staff accounts." };
  }
  if (targetId === userId) return { error: "You can't deactivate your own account — ask another Admin." };
  if (!confirmed) {
    return { error: 'Confirm the checkbox — deactivation is permanent and cannot be undone from this console.' };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from('admin_users')
    .select('id, role, status, name, email')
    .eq('id', targetId)
    .maybeSingle();
  if (!target) return { error: 'Staff account not found.' };

  if (target.role === 'admin' && !can(actingRole, 'manage_admin_accounts')) {
    return { error: "You don't have permission to deactivate an Admin account." };
  }
  if (target.status === 'deactivated') return { error: 'This account is already deactivated.' };

  const { error: updateError } = await admin.from('admin_users').update({ status: 'deactivated' }).eq('id', targetId);
  if (updateError) return { error: `Could not update status: ${updateError.message}` };

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'staff_account_deactivated',
    target_type: 'admin_users',
    target_id: targetId,
    before: { status: target.status },
    after: { status: 'deactivated' },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for staff deactivation:', auditError.message);
  }

  try {
    await sendEmail({ to: target.email, ...staffDeactivatedEmail(target.name) });
  } catch (err) {
    console.error('Failed to send staff deactivation email:', err);
  }

  revalidatePath('/staff/team');
  return null;
}

// Re-exported so the page (a server component) can fetch the list through
// the same RLS-bound path every other staff page uses, rather than always
// reaching for the service-role client just to read a table Admin already
// has full SELECT access to via admin_users_admin_all.
export async function getStaffAccounts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('admin_users')
    .select('id, name, email, role, status, created_at, last_login_at')
    .order('created_at', { ascending: true });
  return data ?? [];
}
