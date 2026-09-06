'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { verifyAltchaSolution } from '@/lib/altcha/server';
import { uploadApplicationDocument } from '@/lib/storage/application-documents';

export type ApplyFormState = { error: string } | null;

const VOLUME_BANDS = ['0-5', '6-15', '16-29', '30+'] as const;

export async function submitApplication(_prevState: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Bot protection (docs/build-phases.md Phase 1) — checked before anything
  // else touches the DB or Storage.
  const altchaOk = await verifyAltchaSolution(formData.get('altcha') as string | null);
  if (!altchaOk) {
    return { error: 'Bot-protection check failed — please try again.' };
  }

  const applicantType = formData.get('applicant_type');
  if (applicantType !== 'business' && applicantType !== 'individual') {
    return { error: 'Choose Business/Training Centre or Individual Trainer.' };
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
  const ownerEmail = (formData.get('owner_email') as string | null)?.trim();
  const trainingFields = (formData.get('training_fields') as string | null)?.trim() || null;
  const trainingDescription = (formData.get('training_description') as string | null)?.trim() || null;
  const volumeBand = formData.get('trainee_volume_band');
  const identificationFile = formData.get('identification_document');
  const proofOfOperationFile = formData.get('proof_of_operation');
  const declarationAgree = formData.get('declaration_agree') === 'on';

  if (!legalName || !displayName) return { error: 'Legal name and display name are required.' };
  if (!ownerFullName || !ownerPhone || !ownerEmail) {
    return { error: 'Owner full name, phone, and email are all required — this is who we reach out to.' };
  }
  if (typeof volumeBand !== 'string' || !VOLUME_BANDS.includes(volumeBand as (typeof VOLUME_BANDS)[number])) {
    return { error: 'Choose an expected trainee volume.' };
  }
  if (!(identificationFile instanceof File) || identificationFile.size === 0) {
    return { error: 'An identification document (business/work ID card, government ID, etc.) is required.' };
  }

  const isBusiness = applicantType === 'business';
  const hasProofFile = proofOfOperationFile instanceof File && proofOfOperationFile.size > 0;
  if (isBusiness && !hasProofFile) {
    return { error: 'A business registration certificate (e.g. CAC in Nigeria) upload is required for Business/Training Centre applicants.' };
  }

  if (!isBusiness) {
    if (!declarationAgree) {
      return { error: 'You must read and agree to the declaration to apply as an Individual Trainer.' };
    }
  }

  let identificationPath: string;
  let proofOfOperationPath: string | null = null;

  try {
    identificationPath = await uploadApplicationDocument({
      supabase,
      userId: user.id,
      file: identificationFile,
      label: 'identification',
    });

    if (hasProofFile) {
      proofOfOperationPath = await uploadApplicationDocument({
        supabase,
        userId: user.id,
        file: proofOfOperationFile as File,
        label: 'proof-of-operation',
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'File upload failed.' };
  }

  const declarationVersion = 'v2-2026-09'; // docs/declaration-form.md — bumped for the Certified Africa rebrand + genericized legal language
  const hdrs = await headers();
  const submissionIp = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      owner_user_id: user.id,
      type: applicantType,
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
      status: 'pending',
      ...(!isBusiness
        ? {
            owner_declaration_signed_at: new Date().toISOString(),
            declaration_version: declarationVersion,
            declaration_submission_ip: submissionIp,
          }
        : {}),
    })
    .select('id')
    .single();

  if (orgError || !org) {
    return { error: `Could not create your organization: ${orgError?.message ?? 'unknown error'}` };
  }

  const { error: applicationError } = await supabase.from('applications').insert({
    org_id: org.id,
    submitted_data: {
      applicant_type: applicantType,
      legal_name: legalName,
      display_name: displayName,
      rc_number: rcNumber,
      address: { street: addressStreet, country: addressCountry, region: addressRegion, locality: addressLocality },
      owner: { full_name: ownerFullName, phone: ownerPhone, email: ownerEmail },
      trainee_volume_band: volumeBand,
      training_fields: trainingFields,
      training_description: trainingDescription,
    },
    status: 'pending',
  });

  if (applicationError) {
    return { error: `Could not submit your application: ${applicationError.message}` };
  }

  redirect('/apply/status');
}
