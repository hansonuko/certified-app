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
 * - There is no hosted-checkout/payment-link endpoint. A charge is created
 *   directly (POST /orchestration/direct-charges) with the chosen payment
 *   method's details already attached — the issuer picks card, mobile
 *   money, or USSD on our own page (app/dashboard/billing/BuyCreditsForm.tsx),
 *   not a Flutterwave-hosted one. Card is the only method whose fields are
 *   sensitive enough to need field-level encryption
 *   (FLUTTERWAVE_ENCRYPTION_KEY, lib/payments/flutterwave-crypto.ts) —
 *   mobile money/USSD carry no card-equivalent secret.
 * - A charge can come back requiring a redirect (3DS, some mobile money
 *   networks) — handled the same "redirect out, redirect back, verify"
 *   shape as Paystack — or requiring an out-of-band action the payer must
 *   complete themselves (dial a USSD code, authorize on their phone) —
 *   surfaced back to the issuer as plain instructions rather than a
 *   redirect, since there's nowhere to redirect *to* — or requiring
 *   OTP/PIN authorization, which is NOT implemented here (see
 *   createDirectCharge's caller in actions.ts): rather than guess at an
 *   unverified request schema for that step, a charge requiring it surfaces
 *   a clear "try a different card" error instead of silently mishandling
 *   real card data. Likewise a mobile money network that comes back wanting
 *   QR-code confirmation (a real, documented v4 outcome) is declined with a
 *   clear message rather than guessed at.
 * - **`bank_transfer` is deliberately NOT one of the offered payment
 *   methods.** It was originally added here as a fourth option (docs/
 *   session-handoff.md's multi-method-payments entry) and reached a real
 *   live user, who got back a plain-text `Cannot POST /orchestration/
 *   direct-charges` body instead of JSON. Cross-referencing several
 *   independent third-party v4 integrations (Flutterwave's own docs never
 *   settle this point) turned up a schema for this exact endpoint whose
 *   `payment_method.type` union is `card | bank_account | mobile_money |
 *   opay | applepay | googlepay | ussd` — **no `bank_transfer`**.
 *   `requires_bank_transfer` is a real v4 `next_action.type` a charge's
 *   *response* can carry, but there is no way to *request* a bank-transfer
 *   charge directly through this endpoint — it isn't a bug in our request
 *   shape, the method just isn't creatable this way. Removed rather than
 *   guessed at a second time; the `next_action.type === 'requires_bank_
 *   transfer'` handling below is kept (harmless, in case any other method
 *   ever returns it as a fallback) but nothing in this file's own
 *   `FlutterwavePaymentMethod` union offers it as a request option anymore.
 *
 * The same cross-referencing also caught two more latent bugs, both fixed
 * here even though only bank_transfer had ever been live-tested: (1) the
 * production API host was `api.flutterwave.com` (the v3 host) — v4's
 * orchestrator endpoints live on a different host entirely,
 * `f4bexperience.flutterwave.com`, which is *why* the bank-transfer request
 * 404'd with a plain-text body instead of a JSON validation error: the path
 * never existed on `api.flutterwave.com` for *any* payment method, so this
 * would have broken every method's very first real charge, not just bank
 * transfer's. (2) a charge's `status` field uses `succeeded`, not
 * `success` — this file's status checks were comparing against the wrong
 * string, which (combined with the wrong host) means no real charge of any
 * kind had ever been correctly recognized as successful even if the
 * request itself had gone through.
 *
 * STILL UNVERIFIED end-to-end against a live charge as of this writing —
 * the host/status fixes above are corrected from cross-referenced,
 * independently-corroborated third-party v4 integrations (not from
 * Flutterwave's own docs, which never state the production host plainly),
 * but no real charge has succeeded yet to confirm them working end-to-end.
 * Recommend a real test charge (card, mobile money, and USSD — one each)
 * before treating this as solid. See docs/session-handoff.md's Flutterwave
 * sections for the full history.
 */

const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';
// v4's orchestrator endpoints (this file) live on a different host than
// v3's `api.flutterwave.com` — see this file's header for how that was
// caught (a live "Cannot POST" 404 on the wrong host, for every method).
const API_BASE = 'https://f4bexperience.flutterwave.com';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

/**
 * `res.json()` throws an opaque "Unexpected token ... is not valid JSON"
 * SyntaxError when the server (or a proxy/gateway in front of it) returns a
 * plain-text or HTML body instead — exactly what happened live for the
 * removed bank_transfer request (a bare `Cannot POST /orchestration/
 * direct-charges`, from hitting the wrong host, see this file's header).
 * Reads the body as text first so a non-JSON response surfaces its actual
 * content (truncated) as a clear error instead of a cryptic parse failure.
 */
async function parseJsonResponse(res: Response): Promise<{ ok: true; json: any } | { ok: false; error: string }> {
  const text = await res.text();
  try {
    return { ok: true, json: text ? JSON.parse(text) : {} };
  } catch {
    const snippet = text.slice(0, 200).trim();
    return { ok: false, error: `Flutterwave returned a non-JSON response (HTTP ${res.status}): ${snippet || '(empty body)'}` };
  }
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
  const parsed = await parseJsonResponse(res);
  if (!parsed.ok) throw new Error(parsed.error);
  const json = parsed.json;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || 'Could not obtain a Flutterwave access token.');
  }

  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 300) * 1000 };
  return cachedToken.accessToken;
}

/**
 * The payment methods this integration supports as directly-requestable
 * `payment_method.type` values on POST /orchestration/direct-charges — see
 * this file's header for why `bank_transfer` isn't one of them despite
 * being a real v4 concept.
 *
 * Left out deliberately (not because they're hard, but because nothing in
 * this codebase can validate or exercise them yet): `bank_account` (direct
 * debit from an already-linked account — a different, mandate-based flow,
 * not a one-off top-up), `applepay`/`googlepay`/`opay`.
 */
export type FlutterwavePaymentMethod =
  | { type: 'card'; card: { number: string; expiryMonth: string; expiryYear: string; cvv: string; holderName?: string } }
  // Ghana/Kenya only in this app today (lib/payments/currency.ts's supported
  // non-NGN currencies) — country_code/network/phone_number per Flutterwave's
  // v4 mobile_money schema.
  | { type: 'mobile_money'; mobileMoney: { network: string; countryCode: string; phoneNumber: string } }
  // Nigeria only — `accountBank` is the payer's own bank's NIP code (e.g.
  // "044" for Access Bank), per the documented `^\d{3,}$` pattern; see
  // lib/payments/flutterwave-options.ts for the list surfaced in the form.
  | { type: 'ussd'; ussd: { accountBank: string } };

export type DirectChargeParams = {
  reference: string; // also used as the idempotency key
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: { first: string; last: string };
  customerPhone?: { countryCode: string; number: string };
  redirectUrl: string;
  paymentMethod: FlutterwavePaymentMethod;
};

export type DirectChargeResult =
  | { outcome: 'redirect_required'; chargeId: string; redirectUrl: string }
  // Mobile money's "authorize on your phone" prompt and USSD's dial code
  // are the same shape from our side: no redirect to send the payer to,
  // just instructions to show them and wait. Resolves later via the
  // webhook or the billing callback page's getCharge() poll, same as any
  // other 'pending' payment.
  | { outcome: 'pending_instructions'; chargeId: string; instructions: string }
  | { outcome: 'success'; chargeId: string }
  | { outcome: 'requires_unsupported_authorization'; chargeId: string; authorizationType: string }
  | { outcome: 'failed'; message: string }
  | { outcome: 'error'; message: string };

function buildPaymentMethodBody(method: FlutterwavePaymentMethod, encryptedCard?: Awaited<ReturnType<typeof encryptCard>>) {
  switch (method.type) {
    case 'card':
      return {
        type: 'card',
        card: { ...encryptedCard, ...(method.card.holderName ? { card_holder_name: method.card.holderName } : {}) },
      };
    case 'mobile_money':
      return {
        type: 'mobile_money',
        mobile_money: {
          network: method.mobileMoney.network,
          country_code: method.mobileMoney.countryCode,
          phone_number: method.mobileMoney.phoneNumber,
        },
      };
    case 'ussd':
      return { type: 'ussd', ussd: { account_bank: method.ussd.accountBank } };
  }
}

/** POST /orchestration/direct-charges — the single-call orchestrator flow (combines customer + payment method + charge creation). */
export async function createDirectCharge(params: DirectChargeParams): Promise<DirectChargeResult> {
  try {
    const accessToken = await getAccessToken();

    const encryptedCard =
      params.paymentMethod.type === 'card'
        ? await encryptCard(
            {
              number: params.paymentMethod.card.number,
              expiryMonth: params.paymentMethod.card.expiryMonth,
              expiryYear: params.paymentMethod.card.expiryYear,
              cvv: params.paymentMethod.card.cvv,
            },
            requireEnv('FLUTTERWAVE_ENCRYPTION_KEY'),
          )
        : undefined;

    // Mobile money requires the outer customer.phone to match the payment
    // method's own phone exactly — derive it from the same source rather
    // than trust two separate call-site values to agree.
    const customerPhone =
      params.paymentMethod.type === 'mobile_money'
        ? { countryCode: params.paymentMethod.mobileMoney.countryCode, number: params.paymentMethod.mobileMoney.phoneNumber }
        : params.customerPhone;

    const res = await fetch(`${API_BASE}/orchestration/direct-charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        // Required on this endpoint — omitting it is a documented 400, not
        // just good correlation-logging practice.
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
          ...(customerPhone ? { phone: { country_code: customerPhone.countryCode, number: customerPhone.number } } : {}),
        },
        payment_method: buildPaymentMethodBody(params.paymentMethod, encryptedCard),
      }),
    });
    const parsed = await parseJsonResponse(res);
    if (!parsed.ok) return { outcome: 'error', message: parsed.error };
    const json = parsed.json;

    if (!res.ok) {
      return { outcome: 'error', message: json.message || json.error?.message || `Flutterwave charge could not be created (HTTP ${res.status}).` };
    }

    const data = json.data;
    const chargeId: string = data?.id;
    const status: string = data?.status;

    // v4 charge statuses are succeeded/pending/failed/voided — not v3's
    // success/failed — see this file's header for how that was caught.
    if (status === 'succeeded') return { outcome: 'success', chargeId };
    if (status === 'failed' || status === 'voided') return { outcome: 'failed', message: json.message || 'Charge failed.' };

    const nextAction = data?.next_action;
    if (nextAction?.type === 'redirect_url' && nextAction.redirect_url?.url) {
      return { outcome: 'redirect_required', chargeId, redirectUrl: nextAction.redirect_url.url };
    }
    // v4 splits OTP/PIN into two distinct next_action types rather than one
    // generic "authorize" — neither is implemented, same "decline rather
    // than guess at an unverified request schema" reasoning as before.
    if (nextAction?.type === 'requires_otp') {
      return { outcome: 'requires_unsupported_authorization', chargeId, authorizationType: 'OTP' };
    }
    if (nextAction?.type === 'requires_pin') {
      return { outcome: 'requires_unsupported_authorization', chargeId, authorizationType: 'PIN' };
    }
    // USSD's dial code, and mobile money's "approve on your phone" prompt —
    // both carry their customer-facing text in next_action.payment_
    // instruction.note.
    if (nextAction?.type === 'payment_instruction' && nextAction.payment_instruction?.note) {
      return { outcome: 'pending_instructions', chargeId, instructions: nextAction.payment_instruction.note };
    }
    // A real v4 next_action type, kept defensively even though nothing in
    // this file's own FlutterwavePaymentMethod union requests bank transfer
    // directly anymore (see file header) — in case any other method ever
    // falls back to it.
    if (nextAction?.type === 'requires_bank_transfer' && nextAction.requires_bank_transfer) {
      const rbt = nextAction.requires_bank_transfer;
      const expiry = rbt.account_expiration_datetime ? ` before ${new Date(rbt.account_expiration_datetime).toLocaleString()}` : '';
      const instructions = `Transfer ${params.amount} ${params.currency} to account ${rbt.account_number} (${rbt.account_bank_name})${expiry}.${rbt.note ? ` ${rbt.note}` : ''}`;
      return { outcome: 'pending_instructions', chargeId, instructions };
    }
    // A documented v4 outcome for some mobile money networks — declined
    // rather than guessed at, same reasoning as the unsupported-
    // authorization branch above.
    if (nextAction?.type === 'qr_code') {
      return {
        outcome: 'error',
        message: "This mobile money network requires QR-code confirmation, which isn't supported yet — try USSD, card, or a different mobile network.",
      };
    }
    if (nextAction?.type === 'requires_additional_fields' || nextAction?.type === 'requires_requery' || nextAction?.type === 'requires_capture') {
      return {
        outcome: 'error',
        message: `This charge needs a follow-up step (${nextAction.type}) that isn't supported yet — try a different payment method.`,
      };
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
    const parsed = await parseJsonResponse(res);
    if (!parsed.ok) return { error: parsed.error };
    const json = parsed.json;
    if (!res.ok || !json.data) return { status: 'pending' };
    const { status, amount, currency } = json.data;
    if (status === 'succeeded') return { status: 'success', amount, currency };
    if (status === 'failed' || status === 'voided') return { status: 'failed' };
    return { status: 'pending' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Flutterwave charge lookup failed.' };
  }
}

// Webhook verification/parsing — the parts of PaymentProvider that still
// apply cleanly to v4. createCheckout/verifyTransaction are NOT
// implemented (v4 has no matching operations, see file header) — Flutterwave
// is deliberately not registered via lib/payments/index.ts's getProvider();
// the charge flow above is called directly from
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
      // The async methods (USSD, mobile money) have a real "waiting on the
      // payer" window a card charge rarely does, and v4 can send an
      // intermediate webhook while that's happening. Only a final
      // 'succeeded' or an explicit failure/void/expiry status is meaningful
      // here — anything else (e.g. 'pending') is deliberately ignored
      // (returns null) rather than mapped to 'failed', so a payment
      // mid-flight is never marked failed just because an intermediate
      // event arrived. lib/payments/confirm.ts's
      // confirmFlutterwaveChargeByReference (the billing callback page's own
      // getCharge() poll) is the fallback that eventually resolves it either
      // way.
      if (!['succeeded', 'failed', 'voided', 'cancelled', 'expired'].includes(data.status)) return null;
      return {
        reference: data.reference,
        status: data.status === 'succeeded' ? 'success' : 'failed',
        amount: data.amount,
        currency: data.currency,
      };
    } catch {
      return null;
    }
  },
};
