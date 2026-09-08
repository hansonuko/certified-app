import { randomBytes } from 'crypto';

// Payment reference generation — same non-enumerable-random shape as
// lib/certificates/public-id.ts, for the same reason (this becomes the
// `provider_reference` a webhook is looked up by, so it should never be
// guessable). Prefixed distinctly per purpose so a reference is
// self-describing in provider dashboards/logs.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomSegment(length: number): string {
  return Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function generatePaymentReference(prefix: 'CREDITS'): string {
  return `${prefix}-${randomSegment(6)}-${randomSegment(4)}`;
}
