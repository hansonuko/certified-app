// altcha-lib's default export is v2 (algorithm-based key derivation —
// ARGON2ID/SCRYPT/PBKDF2 — more configuration than this needs). The `/v1`
// subpath keeps the simple hmacKey-in, boolean-out API and is still fully
// supported for exactly this kind of use — no reason to take on v2's extra
// surface for a bot-protection check on one form.
import { createChallenge, verifySolution } from 'altcha-lib/v1';

/**
 * Server-side half of Altcha (docs/build-phases.md Phase 1) — self-hosted
 * proof-of-work bot protection, no external site/secret key pair needed,
 * just ALTCHA_HMAC_SECRET (.env.example). Used on the application form's
 * final submit step.
 */

function hmacKey(): string {
  const key = process.env.ALTCHA_HMAC_SECRET;
  if (!key) {
    throw new Error('ALTCHA_HMAC_SECRET is not set — generate one with `openssl rand -hex 32`.');
  }
  return key;
}

export function createAltchaChallenge() {
  return createChallenge({ hmacKey: hmacKey(), maxNumber: 100_000 });
}

export function verifyAltchaSolution(payload: string | null): Promise<boolean> {
  if (!payload) return Promise.resolve(false);
  return verifySolution(payload, hmacKey());
}
