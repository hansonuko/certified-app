import { webcrypto, randomBytes } from 'crypto';

/**
 * Field-level encryption for Flutterwave v4 card charges — matches
 * Flutterwave's own documented implementation
 * (developer.flutterwave.com/docs/encryption) exactly, not a
 * reinterpretation: the encryption key is base64-decoded to raw bytes and
 * imported as an AES-GCM key; the 12-character nonce's raw UTF-8 bytes are
 * used directly as the IV (not re-encoded, not hashed); the output is the
 * base64 of SubtleCrypto's AES-GCM ciphertext (which appends the auth tag
 * automatically — no separate tag-handling needed).
 *
 * Card data reaches this function server-side only (the server action that
 * calls it receives raw card fields from the issuer's own submitted form,
 * encrypts immediately, and never logs or persists the plaintext — see
 * app/dashboard/billing/actions.ts's initiateFlutterwaveCharge). This
 * matches Flutterwave's own "backend SDKs handle this" framing (developer.
 * flutterwave.com/docs/encryption) — the encryption key is a server-only
 * secret (CLAUDE.md rule #12), not something shipped to the client bundle.
 */

const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateFlutterwaveNonce(): string {
  return Array.from(randomBytes(12), (b) => NONCE_ALPHABET[b % NONCE_ALPHABET.length]).join('');
}

// No explicit return-type annotation — Node's webcrypto.CryptoKey and the
// DOM lib's global CryptoKey type (both in scope in this Next.js project)
// are structurally incompatible in their KeyUsage unions; inference avoids
// forcing a mismatch between them.
async function importEncryptionKey(encryptionKeyBase64: string) {
  const keyBytes = Buffer.from(encryptionKeyBase64, 'base64');
  return webcrypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
}

export async function encryptFlutterwaveField(plaintext: string, encryptionKeyBase64: string, nonce: string): Promise<string> {
  if (nonce.length !== 12) throw new Error('Flutterwave nonce must be exactly 12 characters.');
  const key = await importEncryptionKey(encryptionKeyBase64);
  const iv = new TextEncoder().encode(nonce);
  const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return Buffer.from(encrypted).toString('base64');
}

export type EncryptedCard = {
  encrypted_card_number: string;
  encrypted_expiry_month: string;
  encrypted_expiry_year: string;
  encrypted_cvv: string;
  nonce: string;
};

/** One nonce reused across all four fields, per Flutterwave's documented card payload shape (a single `nonce` alongside the four encrypted fields). */
export async function encryptCard(
  card: { number: string; expiryMonth: string; expiryYear: string; cvv: string },
  encryptionKeyBase64: string,
): Promise<EncryptedCard> {
  const nonce = generateFlutterwaveNonce();
  const [encrypted_card_number, encrypted_expiry_month, encrypted_expiry_year, encrypted_cvv] = await Promise.all([
    encryptFlutterwaveField(card.number, encryptionKeyBase64, nonce),
    encryptFlutterwaveField(card.expiryMonth, encryptionKeyBase64, nonce),
    encryptFlutterwaveField(card.expiryYear, encryptionKeyBase64, nonce),
    encryptFlutterwaveField(card.cvv, encryptionKeyBase64, nonce),
  ]);
  return { encrypted_card_number, encrypted_expiry_month, encrypted_expiry_year, encrypted_cvv, nonce };
}
