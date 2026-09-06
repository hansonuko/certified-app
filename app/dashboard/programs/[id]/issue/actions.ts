'use server';

import { redirect } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadTraineePhoto } from '@/lib/storage/trainee-photos';
import { issueCertificate as issueCertificateCore, formatDateRangeLabel, addMonthsToDate } from '@/lib/certificates/issue';
import type { TemplateId } from '@/lib/certificates/templates';
import type { BrandConfig } from '@/lib/certificates/types';
import { generateClaimToken, claimTokenExpiresAt } from '@/lib/trainees/claim-token';
import { claimProfileEmail } from '@/lib/email/claim-templates';
import { sendEmail } from '@/lib/email/send';

export type IssueFormState = { error: string } | null;

/**
 * Single-trainee issuance (docs/blueprint.md §3.3A, docs/build-phases.md
 * Phase 4): create the Trainee profile, then generate the Certificate. The
 * actual sign/QR/render/upload/insert sequence lives in
 * lib/certificates/issue.tsx, shared with the bulk issuance processor
 * (docs/build-phases.md Phase 7, lib/bulk-issuance/processor.ts) rather than
 * duplicated here.
 */
export async function issueCertificate(_prev: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const { userId, orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const programId = formData.get('program_id') as string;
  const fullName = (formData.get('full_name') as string | null)?.trim();
  const phone = (formData.get('phone') as string | null)?.trim() || null;
  const email = (formData.get('email') as string | null)?.trim() || null;
  const bio = (formData.get('bio') as string | null)?.trim() || null;
  const country = (formData.get('country') as string | null)?.trim() || null;
  const region = (formData.get('region') as string | null)?.trim() || null;
  const locality = (formData.get('locality') as string | null)?.trim() || null;
  const completionDate = formData.get('completion_date') as string | null;
  const grade = (formData.get('grade') as string | null)?.trim() || null;
  const consent = formData.get('consent');
  const photoFile = formData.get('photo');

  if (!fullName) return { error: 'Full name is required.' };
  if (!completionDate) return { error: 'Completion date is required.' };
  if (consent !== 'on') {
    return {
      error:
        'You must confirm the trainee has consented to a public profile before issuing a certificate (docs/blueprint.md §6).',
    };
  }

  const [{ data: program }, { data: org }] = await Promise.all([
    supabase
      .from('training_programs')
      .select('id, title, duration, start_date, end_date, certificate_validity_months')
      .eq('id', programId)
      .eq('org_id', orgId)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select(
        'display_name, brand_logo_url, brand_primary_color, brand_signatory_name, brand_signatory_title, brand_signature_image_url, brand_template_id',
      )
      .eq('id', orgId)
      .single(),
  ]);

  if (!program) return { error: 'Program not found.' };
  if (!org?.brand_template_id || !org.brand_signatory_name || !org.brand_primary_color) {
    return { error: 'Complete your brand setup before issuing certificates.' };
  }

  let photoUrl: string | null = null;
  try {
    if (photoFile instanceof File && photoFile.size > 0) {
      photoUrl = await uploadTraineePhoto({ supabase, userId, file: photoFile });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Photo upload failed.' };
  }

  const { data: trainee, error: traineeError } = await supabase
    .from('trainees')
    .insert({
      org_id: orgId,
      program_id: programId,
      full_name: fullName,
      photo_url: photoUrl,
      bio,
      phone,
      email,
      country,
      region,
      locality,
      claim_token: generateClaimToken(),
      claim_token_expires_at: claimTokenExpiresAt(),
    })
    .select('id, claim_token')
    .single();

  if (traineeError || !trainee) {
    return { error: `Could not create trainee record: ${traineeError?.message ?? 'unknown error'}` };
  }

  // Best-effort — a flaky email send should never fail an otherwise-successful
  // issuance (docs/build-phases.md Phase 8). Many trainees won't have an email
  // at all, hence the guard.
  if (email && trainee.claim_token) {
    const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claim/${trainee.claim_token}`;
    try {
      await sendEmail({ to: email, ...claimProfileEmail({ traineeName: fullName, orgName: org.display_name, claimUrl }) });
    } catch (err) {
      console.error('Claim-link email failed to send:', err);
    }
  }

  const expiryDate = program.certificate_validity_months
    ? addMonthsToDate(completionDate, program.certificate_validity_months)
    : null;

  const brand: BrandConfig = {
    issuerName: org.display_name,
    logoUrl: org.brand_logo_url ?? undefined,
    primaryColor: org.brand_primary_color,
    signatoryName: org.brand_signatory_name,
    signatoryTitle: org.brand_signatory_title ?? '',
    signatureImageUrl: org.brand_signature_image_url ?? undefined,
  };

  const result = await issueCertificateCore({
    storageClient: supabase,
    adminClient: createAdminClient(),
    ownerUserId: userId,
    orgId,
    programId,
    traineeId: trainee.id,
    traineeName: fullName,
    programTitle: program.title,
    durationLabel: program.duration ?? undefined,
    dateRangeLabel: formatDateRangeLabel(program.start_date, program.end_date),
    completionDate,
    grade,
    expiryDate,
    brand,
    templateId: org.brand_template_id as TemplateId,
  });

  if ('error' in result) return { error: result.error };

  redirect(`/dashboard/certificates/${result.certificateId}`);
}
