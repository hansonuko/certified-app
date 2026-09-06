import { randomBytes } from 'crypto';

/**
 * Trainee self-claim token (docs/build-phases.md Phase 8,
 * docs/session-handoff.md §16 item 1). A bare opaque random lookup key, not a
 * signed/self-verifying JWT — consistent with how `trainees.claim_token` has
 * always been modeled as a plain `text unique` column
 * (supabase/migrations/0006_trainees.sql), not a credential the app verifies
 * by re-deriving a signature.
 *
 * 32 random bytes (256 bits) hex-encoded, so collisions against the column's
 * `unique` constraint are negligible — unlike lib/certificates/public-id.ts's
 * short human-facing codes, callers don't need a retry-on-23505 loop here.
 */
const TOKEN_BYTES = 32;

export function generateClaimToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export const CLAIM_TOKEN_TTL_DAYS = 14;

export function claimTokenExpiresAt(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + CLAIM_TOKEN_TTL_DAYS);
  return d.toISOString();
}
