import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { verifySignatureFromEnv } from '@/lib/certificates/sign';
import { getVerifyRateLimiter } from '@/lib/rate-limit/verify-limiter';
import { VerificationReveal, type VerificationOutcome } from './VerificationReveal';

type VerifyCertificateRow = {
  public_id: string;
  org_id: string;
  trainee_name: string;
  program_title: string;
  issuer_display_name: string;
  completion_date: string;
  issue_date: string;
  expiry_date: string | null;
  status: 'active' | 'revoked' | 'expired';
  grade: string | null;
  pdf_url: string | null;
  signature_hash: string;
  revoked_reason: string | null;
  revoked_at: string | null;
};

// /verify/[public_id] (docs/blueprint.md §3.4, docs/build-phases.md Phase 4)
// — SSR, unauthenticated by design. Rate-limited per IP (CLAUDE.md rule #6),
// looks up exactly one certificate via the verify_certificate() function
// (supabase/migrations/0009/0012 — no "list all certificates" path exists,
// same rule), and recomputes the HMAC signature server-side rather than
// trusting the stored status column at face value (CLAUDE.md rule #3).
export default async function VerificationResultPage({ params }: { params: Promise<{ public_id: string }> }) {
  const { public_id: rawPublicId } = await params;
  const publicId = rawPublicId.toUpperCase();

  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';

  const rateLimit = await getVerifyRateLimiter().limit(ip);
  if (!rateLimit.success) {
    const outcome: VerificationOutcome = { kind: 'rate_limited', retryAfterSeconds: Math.ceil(rateLimit.resetMs / 1000) };
    return <VerificationReveal outcome={outcome} />;
  }

  const supabase = await createClient();
  const { data: cert } = await supabase
    .rpc('verify_certificate', { p_public_id: publicId })
    .maybeSingle<VerifyCertificateRow>();

  if (!cert) {
    return <VerificationReveal outcome={{ kind: 'not_found', publicId }} />;
  }

  const isSignatureValid = verifySignatureFromEnv(
    {
      publicId: cert.public_id,
      orgId: cert.org_id,
      traineeName: cert.trainee_name,
      programTitle: cert.program_title,
      completionDate: cert.completion_date,
      issueDate: cert.issue_date,
      expiryDate: cert.expiry_date,
      grade: cert.grade,
    },
    cert.signature_hash,
  );

  if (!isSignatureValid) {
    return <VerificationReveal outcome={{ kind: 'integrity_failed', publicId: cert.public_id }} />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const displayStatus: 'valid' | 'revoked' | 'expired' =
    cert.status === 'revoked' ? 'revoked' : cert.expiry_date && cert.expiry_date < today ? 'expired' : 'valid';

  return (
    <VerificationReveal
      outcome={{
        kind: 'result',
        displayStatus,
        traineeName: cert.trainee_name,
        programTitle: cert.program_title,
        issuerDisplayName: cert.issuer_display_name,
        completionDate: cert.completion_date,
        expiryDate: cert.expiry_date,
        grade: cert.grade,
        publicId: cert.public_id,
        pdfUrl: cert.pdf_url,
        revokedReason: cert.revoked_reason,
        revokedAt: cert.revoked_at,
      }}
    />
  );
}
