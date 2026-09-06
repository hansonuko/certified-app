'use server';

import { redirect } from 'next/navigation';
import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadTraineePhoto } from '@/lib/storage/trainee-photos';
import { uploadCertificatePdf } from '@/lib/storage/certificate-pdf';
import { generatePublicId } from '@/lib/certificates/public-id';
import { signCertificate } from '@/lib/certificates/sign';
import { CERTIFICATE_TEMPLATES, type TemplateId } from '@/lib/certificates/templates';
import type { BrandConfig, CertificateData } from '@/lib/certificates/types';

export type IssueFormState = { error: string } | null;

// Astronomically unlikely to ever loop more than once (33^9 possible IDs,
// supabase/migrations/0012's verify_certificate/public_id uniqueness), but a
// bounded retry is cheap insurance against a collision failing the whole
// issuance outright.
const MAX_PUBLIC_ID_ATTEMPTS = 5;
const UNIQUE_VIOLATION = '23505';

function formatDateRangeLabel(startDate: string | null, endDate: string | null): string | undefined {
  if (!startDate && !endDate) return undefined;
  const monthYear = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const monthOnly = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  if (startDate && endDate) return `${monthOnly(startDate)} – ${monthYear(endDate)}`;
  return monthYear(startDate ?? endDate!);
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Single-trainee issuance (docs/blueprint.md §3.3A, docs/build-phases.md
 * Phase 4): create the Trainee profile, then generate the Certificate —
 * random public_id, server-side HMAC signature (lib/certificates/sign.ts),
 * QR code, rendered PDF, uploaded to Storage. The certificates table has no
 * write RLS for anyone (supabase/migrations/0007), so the row insert goes
 * through the service-role client, same pattern as every other write that
 * can't go through the regular session-scoped client.
 */
export async function issueCertificate(_prev: IssueFormState, formData: FormData): Promise<IssueFormState> {
  const { userId, orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const programId = formData.get('program_id') as string;
  const fullName = (formData.get('full_name') as string | null)?.trim();
  const phone = (formData.get('phone') as string | null)?.trim() || null;
  const email = (formData.get('email') as string | null)?.trim() || null;
  const bio = (formData.get('bio') as string | null)?.trim() || null;
  const state = (formData.get('state') as string | null)?.trim() || null;
  const lga = (formData.get('lga') as string | null)?.trim() || null;
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
    .insert({ org_id: orgId, program_id: programId, full_name: fullName, photo_url: photoUrl, bio, phone, email, state, lga })
    .select('id')
    .single();

  if (traineeError || !trainee) {
    return { error: `Could not create trainee record: ${traineeError?.message ?? 'unknown error'}` };
  }

  const issueDate = new Date().toISOString().slice(0, 10);
  const expiryDate = program.certificate_validity_months
    ? addMonths(completionDate, program.certificate_validity_months)
    : null;

  const brand: BrandConfig = {
    issuerName: org.display_name,
    logoUrl: org.brand_logo_url ?? undefined,
    primaryColor: org.brand_primary_color,
    signatoryName: org.brand_signatory_name,
    signatoryTitle: org.brand_signatory_title ?? '',
    signatureImageUrl: org.brand_signature_image_url ?? undefined,
  };
  const TemplateComponent = CERTIFICATE_TEMPLATES[org.brand_template_id as TemplateId];
  const admin = createAdminClient();

  let certificateId: string | null = null;

  for (let attempt = 0; attempt < MAX_PUBLIC_ID_ATTEMPTS && !certificateId; attempt++) {
    const publicId = generatePublicId();
    const signatureHash = signCertificate({
      publicId,
      orgId,
      traineeName: fullName,
      programTitle: program.title,
      completionDate,
      issueDate,
      expiryDate,
      grade,
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${publicId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });

    const data: CertificateData = {
      traineeName: fullName,
      programTitle: program.title,
      durationLabel: program.duration ?? undefined,
      dateRangeLabel: formatDateRangeLabel(program.start_date, program.end_date),
      distinction: grade ?? undefined,
      publicId,
      qrDataUrl,
    };

    const pdfBuffer = await renderToBuffer(<TemplateComponent brand={brand} data={data} />);
    const pdfUrl = await uploadCertificatePdf({ supabase, ownerUserId: userId, publicId, pdf: pdfBuffer });

    const { data: cert, error: certError } = await admin
      .from('certificates')
      .insert({
        public_id: publicId,
        trainee_id: trainee.id,
        org_id: orgId,
        program_id: programId,
        trainee_name_snapshot: fullName,
        program_title_snapshot: program.title,
        completion_date: completionDate,
        grade,
        issue_date: issueDate,
        expiry_date: expiryDate,
        status: 'active',
        signature_hash: signatureHash,
        pdf_url: pdfUrl,
      })
      .select('id')
      .single();

    if (cert) {
      certificateId = cert.id;
    } else if (certError?.code !== UNIQUE_VIOLATION) {
      return { error: `Could not create certificate: ${certError?.message ?? 'unknown error'}` };
    }
  }

  if (!certificateId) {
    return { error: 'Could not generate a unique certificate ID after several attempts. Please try again.' };
  }

  redirect(`/dashboard/certificates/${certificateId}`);
}
