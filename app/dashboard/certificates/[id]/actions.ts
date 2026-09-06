'use server';

import { revalidatePath } from 'next/cache';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type RevokeState = { error: string } | null;

/**
 * Issuer-initiated revocation (docs/build-phases.md Phase 4) — distinct from
 * the staff moderation queue deferred to Phase 2.5/5
 * (docs/roles-permissions.md §2's "Revoke a certificate" row covers which
 * *staff* roles can revoke; it doesn't speak to an issuer correcting their
 * own org's own issuance). Reason required, permanently disclosed on the
 * verification page (docs/blueprint.md §6), audit-logged (CLAUDE.md rule #7)
 * with actor_type = 'issuer' (supabase/migrations/0012 — audit_log's
 * actor_id/admin_users FK has no row for a non-staff user, so this uses the
 * actor_user_id column added there instead). The certificates table has no
 * write RLS for anyone (supabase/migrations/0007), so the actual status flip
 * goes through the service-role client, after confirming ownership via the
 * session-scoped client's own read (certificates_owner_select).
 */
export async function revokeCertificate(certificateId: string, _prev: RevokeState, formData: FormData): Promise<RevokeState> {
  const { userId, orgId } = await requireApprovedIssuerSession();
  const reason = (formData.get('reason') as string | null)?.trim();

  if (!reason) {
    return { error: 'A reason is required to revoke a certificate.' };
  }

  const supabase = await createClient();
  const { data: cert } = await supabase
    .from('certificates')
    .select('id, status, org_id')
    .eq('id', certificateId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!cert) return { error: 'Certificate not found.' };
  if (cert.status === 'revoked') return { error: 'This certificate is already revoked.' };

  const admin = createAdminClient();
  const revokedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from('certificates')
    .update({ status: 'revoked', revoked_reason: reason, revoked_at: revokedAt })
    .eq('id', certificateId);

  if (updateError) {
    return { error: `Could not revoke certificate: ${updateError.message}` };
  }

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_type: 'issuer',
    actor_user_id: userId,
    action: 'certificate_revoked',
    target_type: 'certificates',
    target_id: certificateId,
    before: { status: cert.status },
    after: { status: 'revoked', reason },
  });
  if (auditError) {
    console.error('Failed to write AuditLog row for certificate revocation:', auditError.message);
  }

  revalidatePath(`/dashboard/certificates/${certificateId}`);
  return null;
}
