import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import type { PaymentProvider, WebhookEvent } from './provider';
import { encryptCard } from './flutterwave-crypto';

/**
 * Flutterwave v4 — NOT v3. This file was originally written against v3's
 * simple secret-key + hosted-checkout-link model; real credentials
 * surfaced that v4 is architecturally different (docs/session-handoff.md
 * §20):
 *
 * - Auth is OAuth2 client-credentials (FLUTTERWAVE_CLIENT_ID/_SECRET
 *   against idp.flutterwave.com), not a static Bearer secret key.
 * - There is no hosted-checkout/payment-link endpoint. A card charge is
 *   created directly (POST /orchestration/direct-charges) with the card
 *   number/expiry/CVV already attached, field-encrypted with
 *   FLUTTERWAVE_ENCRYPTION_KEY (lib/payments/flutterwave-crypto.ts) — the
 *   issuer's card details are collected on our own page
 *   (app/dashboard/billing/FlutterwaveCardForm.tsx), not a Flutterwave-
 *   hosted one.
 * - A charge can come back requiring a redirect (3DS) — handled the same
 *   "redirect out, redirect back, verify" shape as Paystack — or requiring
 *   PIN/OTP authorization, which is NOT implemented here (see
 *   createDirectCharge's caller in actions.ts): rather than guess at an
 *   unverified request schema for that step, a charge requiring it surfaces
 *   a clear "try a different card" error instead of silently mishandling
 *   real card data.
 *
 * UNTESTED against any real Flutterwave endpoint as of this writing — the
 * credentials on file are live (no sandbox pair was available), and a
 * mistake against a charge-creation call spends real money, so this was
 * deliberately never exercised end-to-end. Written faithfully to
 * developer.flutterwave.com's current v4 reference docs; recommend a real
 * sandbox-credentialed test pass before relying on it for actual
 * production traffic — see docs/session-handoff.md §20.
 */

const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
const API_BASE = 'https://api.flutterwave.com';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('FLUTTERWAVE_CLIENT_ID'),
      client_secret: requireEnv('FLUTTERWAVE_CLIENT_SECRET'),
      grant_type: 'client_credentials',
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || 'Could not obtain a Flutterwave access token.');
  }

  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 300) * 1000 };
  return cachedToken.accessToken;
}

export type DirectChargeParams = {
  reference: string; // also used as the idempotency key
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: { first: string; last: string };
  customerPhone?: { countryCode: string; number: string };
  redirectUrl: string;
  card: { number: string; expiryMonth: string; expiryYear: string; cvv: string; holderName?: string };
};

export type DirectChargeResult =
  | { outcome: 'redirect_required'; chargeId: string; redirectUrl: string }
  | { outcome: 'success'; chargeId: string }
  | { outcome: 'requires_unsupported_authorization'; chargeId: string; authorizationType: string }
  | { outcome: 'failed'; message: string }
  | { outcome: 'error'; message: string };

/** POST /orchestration/direct-charges — the single-call orchestrator flow (combines customer + payment method + charge creation), per developer.flutterwave.com/reference/orchestration_direct_charge_post. */
export async function createDirectCharge(params: DirectChargeParams): Promise<DirectChargeResult> {
  try {
    const accessToken = await getAccessToken();
    const encryptedCard = await encryptCard(
      { number: params.card.number, expiryMonth: params.card.expiryMonth, expiryYear: params.card.expiryYear, cvv: params.card.cvv },
      requireEnv('FLUTTERWAVE_ENCRYPTION_KEY'),
    );

    const res = await fetch(`${API_BASE}/orchestration/direct-charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Trace-Id': randomUUID(),
        'X-Idempotency-Key': params.reference,
      },
      body: JSON.stringify({
        reference: params.reference,
        amount: params.amount,
        currency: params.currency,
        redirect_url: params.redirectUrl,
        customer: {
          email: params.customerEmail,
          ...(params.customerName ? { name: { first: params.customerName.first, last: params.customerName.last } } : {}),
          ...(params.customerPhone ? { phone: { country_code: params.customerPhone.countryCode, number: params.customerPhone.number } } : {}),
        },
        payment_method: {
          type: 'card',
          card: { ...encryptedCard, ...(params.card.holderName ? { card_holder_name: params.card.holderName } : {}) },
        },
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      return { outcome: 'error', message: json.message || `Flutterwave charge could not be created (HTTP ${res.status}).` };
    }

    const data = json.data;
    const chargeId: string = data?.id;
    const status: string = data?.status;

    if (status === 'success') return { outcome: 'success', chargeId };
    if (status === 'failed') return { outcome: 'failed', message: json.message || 'Charge failed.' };

    const nextAction = data?.next_action;
    if (nextAction?.type === 'redirect_url' && nextAction.redirect_url?.url) {
      return { outcome: 'redirect_required', chargeId, redirectUrl: nextAction.redirect_url.url };
    }
    if (nextAction?.type === 'authorize') {
      return { outcome: 'requires_unsupported_authorization', chargeId, authorizationType: nextAction.authorization?.type ?? 'unknown' };
    }

    return { outcome: 'error', message: 'Unrecognized response from Flutterwave.' };
  } catch (err) {
    return { outcome: 'error', message: err instanceof Error ? err.message : 'Flutterwave request failed.' };
  }
}

export type ChargeStatusResult = { status: 'success'; amount: number; currency: string } | { status: 'failed' } | { status: 'pending' } | { error: string };

/** GET /charges/{id} — v4 has no "verify by our own reference" endpoint, only by Flutterwave's own charge id (stored on the payments row at creation time, supabase/migrations/0031). */
export async function getCharge(chargeId: string): Promise<ChargeStatusResult> {
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(`${API_BASE}/charges/${encodeURIComponent(chargeId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Trace-Id': randomUUID() },
    });
    const json = await res.json();
    if (!res.ok || !json.data) return { status: 'pending' };
    const { status, amount, currency } = json.data;
    if (status === 'success') return { status: 'success', amount, currency };
    if (status === 'failed') return { status: 'failed' };
    return { status: 'pending' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Flutterwave charge lookup failed.' };
  }
}

// Webhook verification/parsing — the parts of PaymentProvider that still
// apply cleanly to v4. createCheckout/verifyTransaction are NOT
// implemented (v4 has no matching operations, see file header) — Flutterwave
// is deliberately not registered via lib/payments/index.ts's getProvider();
// the card-charge flow above is called directly from
// app/dashboard/billing/actions.ts instead.
export const flutterwaveWebhook: Pick<PaymentProvider, 'verifyWebhookSignature' | 'parseWebhookEvent'> = {
  // v4's webhook signs the raw body with HMAC-SHA256 using the dashboard-
  // configured secret hash, sent as the `flutterwave-signature` header
  // (base64), per developer.flutterwave.com/docs/webhooks — different from
  // v3's plain shared-secret `verif-hash` comparison.
  verifyWebhookSignature(req: Request, rawBody: string): boolean {
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    if (!secret) return false;
    const received = req.headers.get('flutterwave-signature');
    if (!received) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  },

  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const json = JSON.parse(rawBody);
      const data = json.data;
      if (!data?.reference) return null;
      return {
        reference: data.reference,
        status: data.status === 'success' ? 'success' : 'failed',
        amount: data.amount,
        currency: data.currency,
      };
    } catch {
      return null;
    }
  },
};
