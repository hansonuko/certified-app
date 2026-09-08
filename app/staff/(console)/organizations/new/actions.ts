'use server';

import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadApplicationDocument } from '@/lib/storage/application-documents';
import { generateOrgSlug } from '@/lib/slug';
import { pickAccountManagerForAssignment } from '@/lib/staff/assign-account-manager';
import { organizationManuallyAddedEmail } from '@/lib/email/organization-templates';
import { sendEmail } from '@/lib/email/send';
import { randomBytes } from 'crypto';

export type ManualOrgState = { error: string } | null;

const VOLUME_BANDS = ['0-5', '6-15', '16-29', '30+'] as const;

function generateTempPassword(): string {
  return randomBytes(21).toString('base64url');
}

/**
 * Staff-initiated organization entry (Admin + Account Manager), bypassing
 * the applicant-submitted /apply flow — but not CLAUDE.md rule #1's
 * approval gate: the row is still created with status set explicitly
 * (here, 'approved') by this code, same status column every issuance
 * code path already checks, just skipping the review-queue step since
 * staff is both submitter and approver in one action.
 *
 * Scoped to Business/Training Centre only for now — Individual Trainer
 * requires docs/declaration-form.md's signed declaration, which lives
 * only as inline JSX in app/(auth)/apply/ApplyForm.tsx today. Duplicating
 * that legal text here risked the two copies drifting apart with no
 * shared source; extracting it into a shared component is a real (small)
 * refactor of an already-correct, legally-sensitive flow, not something
 * to fold silently into this change. Flagged as a follow-up rather than
 * done partially.
 *
 * organizations.owner_user_id is NOT NULL — an Organization can't exist
 * without an owner auth.users row, and staff manual entry has no
 * pre-existing applicant account to link to the way /apply does (the
 * owner is already signed in there). So this action creates the owner's
 * Supabase Auth user itself, exactly like inviteStaffMember does for a
 * new staff account (app/staff/(console)/team/actions.ts) — temp
 * password emailed via organizationManuallyAddedEmail, owner expected to
 * change it via "Forgot password" after first sign-in.
 */
export async function createOrganizationManually(_prev: ManualOrgState, formData: FormData): Promise<ManualOrgState> {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'create_organization')) {
    return { error: "You don't have permission to add organizations." };
  }

  const legalName = (formData.get('legal_name') as string | null)?.trim();
  const displayName = (formData.get('display_name') as string | null)?.trim();
  const rcNumber = (formData.get('rc_number') as string | null)?.trim() || null;
  const addressStreet = (formData.get('address_street') as string | null)?.trim() || null;
  const addressCountry = (formData.get('address_country') as string | null)?.trim() || null;
  const addressRegion = (formData.get('address_region') as string | null)?.trim() || null;
  const addressLocality = (formData.get('address_locality') as string | null)?.trim() || null;
  const ownerFullName = (formData.get('owner_full_name') as string | null)?.trim();
  const ownerPhone = (formData.get('owner_phone') as string | null)?.trim();
  const ownerEmail = (formData.get('owner_email') as string | null)?.trim().toLowerCase();
  const trainingFields = (formData.get('training_fields') as string | null)?.trim() || null;
  const trainingDescription = (formData.get('training_description') as string | null)?.trim() || null;
  const volumeBand = formData.get('trainee_volume_band');
  const identificationFile = formData.get('identification_document');
  const proofOfOperationFile = formData.get('proof_of_operation');
  const verifiedOutOfBand = formData.get('verified_out_of_band') === 'on';
  const verificationNote = (formData.get('verification_note') as string | null)?.trim() || null;

  if (!legalName || !displayName) return { error: 'Legal name and display name are required.' };
  if (!ownerFullName || !ownerPhone || !ownerEmail) {
    return { error: "Owner full name, phone, and email are all required — this is who's reached out to." };
  }
  if (typeof volumeBand !== 'string' || !VOLUME_BANDS.includes(volumeBand as (typeof VOLUME_BANDS)[number])) {
    return { error: 'Choose an expected trainee volume.' };
  }

  const hasIdFile = identificationFile instanceof File && identificationFile.size > 0;
  const hasProofFile = proofOfOperationFile instanceof File && proofOfOperationFile.size > 0;

  if (verifiedOutOfBand) {
    if (!verificationNote) {
      return { error: 'A note is required when attesting identity was verified out-of-band.' };
    }
  } else {
    if (!hasIdFile) {
      return { error: 'Upload an identification document, or check "verified out-of-band" with a note instead.' };
    }
    if (!hasProofFile) {
      return { error: 'Upload a business registration certificate, or check "verified out-of-band" with a note instead.' };
    }
  }

  const admin = createAdminClient();

  const tempPassword = generateTempPassword();
  const { data: ownerAuthUser, error: ownerAuthError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { user_type: 'issuer', full_name: ownerFullName },
  });
  if (ownerAuthError || !ownerAuthUser.user) {
    // Checking for a pre-existing email via listUsers() first would need
    // pagination handling at any real scale — letting createUser itself be
    // the source of truth and pattern-matching its specific failure avoids
    // that entirely.
    if (ownerAuthError?.message.toLowerCase().includes('already been registered')) {
      return {
        error: 'An account with this owner email already exists — ask them to log in and apply at /apply, or use a different owner email.',
      };
    }
    return { error: `Could not create the owner's account: ${ownerAuthError?.message ?? 'unknown error'}` };
  }
  const ownerUserId = ownerAuthUser.user.id;

  let identificationPath: string | null = null;
  let proofOfOperationPath: string | null = null;
  try {
    const [idResult, proofResult] = await Promise.all([
      hasIdFile
        ? uploadApplicationDocument({ supabase: admin, userId: ownerUserId, file: identificationFile as File, label: 'identification' })
        : Promise.resolve(null),
      hasProofFile
        ? uploadApplicationDocument({ supabase: admin, userId: ownerUserId, file: proofOfOperationFile as File, label: 'proof-of-operation' })
        : Promise.resolve(null),
    ]);
    identificationPath = idResult;
    proofOfOperationPath = proofResult;
  } catch (err) {
    // Don't leave a dangling owner auth user with no organization behind.
    await admin.auth.admin.deleteUser(ownerUserId);
    return { error: err instanceof Error ? err.message : 'File upload failed.' };
  }

  const assignedAccountManagerId = await pickAccountManagerForAssignment({ id: userId, role });

  const MAX_SLUG_ATTEMPTS = 5;
  let org: { id: string } | null = null;
  let orgError: { code?: string; message: string } | null = null;
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS && !org; attempt++) {
    const result = await admin
      .from('organizations')
      .insert({
        owner_user_id: ownerUserId,
        type: 'business',
        legal_name: legalName,
        display_name: displayName,
        rc_number: rcNumber,
        address_street: addressStreet,
        address_country: addressCountry,
        address_region: addressRegion,
        address_locality: addressLocality,
        owner_full_name: ownerFullName,
        owner_phone: ownerPhone,
        owner_email: ownerEmail,
        owner_id_document_url: identificationPath,
        proof_of_operation_url: proofOfOperationPath,
        trainee_volume_band: volumeBand,
        slug: generateOrgSlug(displayName),
        status: 'approved',
        approved_at: now,
        assigned_account_manager_id: assignedAccountManagerId,
      })
      .select('id')
      .single();

    if (result.data) {
      org = result.data;
    } else {
      orgError = result.error;
      const isSlugCollision = result.error?.code === '23505' && result.error.message.includes('organizations_slug_key');
      if (!isSlugCollision) break;
    }
  }

  if (!org) {
    await admin.auth.admin.deleteUser(ownerUserId);
    if (orgError?.code === '23505' && orgError.message.includes('rc_number')) {
      return { error: 'That business registration number is already registered on Certified Africa.' };
    }
    return { error: `Could not create the organization: ${orgError?.message ?? 'unknown error'}` };
  }

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'organization_manually_created',
    target_type: 'organizations',
    target_id: org.id,
    before: null,
    after: {
      legal_name: legalName,
      display_name: displayName,
      status: 'approved',
      verified_out_of_band: verifiedOutOfBand,
      verification_note: verifiedOutOfBand ? verificationNote : null,
      training_fields: trainingFields,
      training_description: trainingDescription,
      assigned_account_manager_id: assignedAccountManagerId,
    },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for manual organization creation:', auditError.message);
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendEmail({
      to: ownerEmail,
      ...organizationManuallyAddedEmail(ownerFullName, displayName, tempPassword, appUrl),
    });
  } catch (err) {
    console.error('Failed to send manual-org-creation email:', err);
  }

  redirect(`/staff/organizations/${org.id}`);
}
