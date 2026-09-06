import { randomBytes } from 'crypto';

// Random, non-sequential public certificate ID (docs/blueprint.md §3.4, e.g.
// "CERT-8F2K9-XQ41") — deliberately not an incrementing integer so IDs can't
// be enumerated/scraped in order (docs/blueprint.md §6 "Certificate ID
// guessing / enumeration"). Alphabet excludes 0/O and 1/I (easy to
// mis-transcribe off a printed certificate or a photographed QR code).
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomSegment(length: number): string {
  return Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function generatePublicId(): string {
  return `CERT-${randomSegment(5)}-${randomSegment(4)}`;
}
