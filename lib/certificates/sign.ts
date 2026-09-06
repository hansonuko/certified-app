import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Certificate signing (docs/blueprint.md §3.4, CLAUDE.md rule #3). HMAC-SHA256
 * over the certificate's core, immutable fields — the same fields
 * certificates.guard_certificate_snapshot_columns() (supabase/migrations/0007)
 * refuses to let anyone change after issuance, plus org_id, expiry_date, and
 * grade, which are also part of "what this certificate asserts." Computed
 * once at issuance (lib/supabase/admin.ts, service role, inside a server
 * action) and re-checked on every /verify request — a direct DB edit to any
 * signed field without going through this module changes the recomputed
 * signature and flips verification to "integrity check failed."
 *
 * `computeSignature` is a pure function (secret passed in, no env access) so
 * it's unit-testable without a live Supabase project or a real env var —
 * same split as scripts/bootstrap-admin-guard.ts. `signCertificate` and
 * `verifySignatureFromEnv` are the env-reading wrappers every call site
 * actually uses.
 *
 * Server-only. CERTIFICATE_SIGNING_SECRET has no NEXT_PUBLIC_ prefix, so
 * importing this from anything that ends up in the client bundle throws at
 * runtime the moment a signing/verifying function actually runs — the same
 * deliberate tripwire lib/supabase/admin.ts uses for the service role key.
 * Never log the secret itself; the functions below never return it.
 */

export type CertificateSignaturePayload = {
  publicId: string;
  orgId: string;
  traineeName: string;
  programTitle: string;
  completionDate: string; // ISO date (YYYY-MM-DD)
  issueDate: string; // ISO date (YYYY-MM-DD)
  expiryDate: string | null;
  grade: string | null;
};

/** Canonical, order-fixed serialization — changing this shape invalidates every signature ever issued. */
function canonicalPayload(payload: CertificateSignaturePayload): string {
  return [
    payload.publicId,
    payload.orgId,
    payload.traineeName,
    payload.programTitle,
    payload.completionDate,
    payload.issueDate,
    payload.expiryDate ?? '',
    payload.grade ?? '',
  ].join('|');
}

export function computeSignature(payload: CertificateSignaturePayload, secret: string): string {
  return createHmac('sha256', secret).update(canonicalPayload(payload)).digest('hex');
}

function getSigningSecret(): string {
  const secret = process.env.CERTIFICATE_SIGNING_SECRET;
  if (!secret) throw new Error('CERTIFICATE_SIGNING_SECRET is not set.');
  return secret;
}

/** Called once, at issuance, from a server action via lib/supabase/admin.ts. */
export function signCertificate(payload: CertificateSignaturePayload): string {
  return computeSignature(payload, getSigningSecret());
}

/**
 * Recomputes the signature from the currently-stored fields and compares it
 * against the stored signature_hash using a constant-time comparison
 * (timing-safe even though this isn't a secret-guessing context, it's the
 * standard-practice comparison for any cryptographic signature check).
 * Returns false (never throws) on any mismatch, including a malformed stored
 * hash — the /verify route turns `false` into the "integrity check failed"
 * display state, not a 500.
 */
export function verifySignatureFromEnv(payload: CertificateSignaturePayload, storedSignature: string): boolean {
  const expected = computeSignature(payload, getSigningSecret());
  const expectedBuf = Buffer.from(expected, 'hex');
  const storedBuf = Buffer.from(storedSignature, 'hex');
  if (expectedBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(expectedBuf, storedBuf);
}
