import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadCertificatePdf } from '@/lib/storage/certificate-pdf';
import { spendCertificateCredit, refundCertificateCredit } from '@/lib/payments/credits';
import { generatePublicId } from './public-id';
import { signCertificate } from './sign';
import { CERTIFICATE_TEMPLATES, type TemplateId } from './templates';
import type { BrandConfig, CertificateData } from './types';

/**
 * The actual "issue one certificate" core — sign, QR, render, upload,
 * insert — factored out of app/dashboard/programs/[id]/issue/actions.tsx
 * (Phase 4) so the bulk issuance processor (Phase 7 item 2,
 * lib/bulk-issuance/processor.ts) can call the exact same logic per row
 * instead of a second, drifting copy of it.
 *
 * Monetization Flow A (docs/build-phases.md Phase 11 item 1) gates here
 * too, not in either caller: one certificate credit is spent atomically
 * before anything is rendered/uploaded (params.adminClient is always
 * service-role, so this check can't be bypassed from either call site), and
 * refunded if the certificate ultimately fails to get created — an issuer
 * should never lose a credit for a certificate that was never actually
 * issued. This is deliberately independent of `organizations.status`
 * (CLAUDE.md rule #1) — approval and credits gate two different things
 * (whether you may issue at all, vs. whether you've paid for this one).
 */

const MAX_PUBLIC_ID_ATTEMPTS = 5;
const UNIQUE_VIOLATION = '23505';

export function formatDateRangeLabel(startDate: string | null, endDate: string | null): string | undefined {
  if (!startDate && !endDate) return undefined;
  const monthYear = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const monthOnly = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  if (startDate && endDate) return `${monthOnly(startDate)} – ${monthYear(endDate)}`;
  return monthYear(startDate ?? endDate!);
}

export function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export type IssueCertificateParams = {
  /** Used for the PDF upload's owner-prefixed storage path — session-scoped client for single-entry, service-role for the bulk processor (no session exists there). */
  storageClient: SupabaseClient;
  /** Used for the certificates insert — always service-role; certificates has no write RLS for anyone (supabase/migrations/0007). */
  adminClient: SupabaseClient;
  ownerUserId: string;
  orgId: string;
  programId: string;
  traineeId: string;
  traineeName: string;
  programTitle: string;
  durationLabel?: string;
  dateRangeLabel?: string;
  completionDate: string;
  grade: string | null;
  expiryDate: string | null;
  brand: BrandConfig;
  templateId: TemplateId;
};

export type IssueCertificateResult = { certificateId: string; publicId: string } | { error: string };

export async function issueCertificate(params: IssueCertificateParams): Promise<IssueCertificateResult> {
  const hasCredit = await spendCertificateCredit(params.adminClient, params.orgId);
  if (!hasCredit) {
    return { error: 'Insufficient certificate credits — top up in Billing to continue issuing certificates.' };
  }

  let result: IssueCertificateResult;
  try {
    result = await issueCertificateAfterCreditCheck(params);
  } catch (err) {
    await refundCertificateCredit(params.adminClient, params.orgId, 'Issuance threw before completing');
    throw err;
  }
  if ('error' in result) {
    await refundCertificateCredit(params.adminClient, params.orgId, result.error);
  }
  return result;
}

async function issueCertificateAfterCreditCheck(params: IssueCertificateParams): Promise<IssueCertificateResult> {
  const issueDate = new Date().toISOString().slice(0, 10);
  const TemplateComponent = CERTIFICATE_TEMPLATES[params.templateId];

  for (let attempt = 0; attempt < MAX_PUBLIC_ID_ATTEMPTS; attempt++) {
    const publicId = generatePublicId();
    const signatureHash = signCertificate({
      publicId,
      orgId: params.orgId,
      traineeName: params.traineeName,
      programTitle: params.programTitle,
      completionDate: params.completionDate,
      issueDate,
      expiryDate: params.expiryDate,
      grade: params.grade,
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${publicId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 256 });

    const data: CertificateData = {
      traineeName: params.traineeName,
      programTitle: params.programTitle,
      durationLabel: params.durationLabel,
      dateRangeLabel: params.dateRangeLabel,
      distinction: params.grade ?? undefined,
      publicId,
      qrDataUrl,
    };

    const pdfBuffer = await renderToBuffer(<TemplateComponent brand={params.brand} data={data} />);
    const pdfUrl = await uploadCertificatePdf({
      supabase: params.storageClient,
      ownerUserId: params.ownerUserId,
      publicId,
      pdf: pdfBuffer,
    });

    const { data: cert, error: certError } = await params.adminClient
      .from('certificates')
      .insert({
        public_id: publicId,
        trainee_id: params.traineeId,
        org_id: params.orgId,
        program_id: params.programId,
        trainee_name_snapshot: params.traineeName,
        program_title_snapshot: params.programTitle,
        completion_date: params.completionDate,
        grade: params.grade,
        issue_date: issueDate,
        expiry_date: params.expiryDate,
        status: 'active',
        signature_hash: signatureHash,
        pdf_url: pdfUrl,
      })
      .select('id')
      .single();

    if (cert) return { certificateId: cert.id, publicId };
    if (certError?.code !== UNIQUE_VIOLATION) {
      return { error: `Could not create certificate: ${certError?.message ?? 'unknown error'}` };
    }
    // Unique violation on public_id — loop again with a freshly generated one.
  }

  return { error: 'Could not generate a unique certificate ID after several attempts.' };
}
