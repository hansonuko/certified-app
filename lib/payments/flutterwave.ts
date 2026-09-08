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
 *   money, USSD, or bank transfer on our own page
 *   (app/dashboard/billing/BuyCreditsForm.tsx), not a Flutterwave-hosted
 *   one. Card is the only method whose fields are sensitive enough to need
 *   field-level encryption (FLUTTERWAVE_ENCRYPTION_KEY,
 *   lib/payments/flutterwave-crypto.ts) — mobile money/USSD/bank transfer
 *   carry no card-equivalent secret, per Flutterwave's own v4 schema.
 * - A charge can come back requiring a redirect (3DS, some mobile money
 *   networks) — handled the same "redirect out, redirect back, verify"
 *   shape as Paystack — requiring an out-of-band action the payer must
 *   complete themselves (dial a USSD code, transfer to a generated account,
 *   authorize on their phone) — surfaced back to the issuer as plain
 *   instructions rather than a redirect, since there's nowhere to redirect
 *   *to* — or requiring PIN/OTP authorization, which is NOT implemented
 *   here (see createDirectCharge's caller in actions.ts): rather than guess
 *   at an unverified request schema for that step, a charge requiring it
 *   surfaces a clear "try a different card" error instead of silently
 *   mishandling real card data. Likewise a mobile money network that comes
 *   back wanting QR-code confirmation (a real, documented v4 outcome) is
 *   declined with a clear message rather than guessed at.
 *
 * UNTESTED against any real Flutterwave endpoint as of this writing — the
 * credentials on file are live (no sandbox pair was available), and a
 * mistake against a charge-creation call spends real money, so this was
 * deliberately never exercised end-to-end for any method, card included.
 * Written faithfully to developer.flutterwave.com's current v4 reference
 * docs (payment-orchestrator-flow, payment-methods, card, bank-transfer);
 * recommend a real sandbox-credentialed test pass — one per payment method,
 * not just card — before relying on any of this for actual production
 * traffic. See docs/session-handoff.md §20 and its follow-up entry for this
 * multi-method work.
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

/**
 * The four payment methods this integration supports, per developer.
 * flutterwave.com/docs/payment-methods' v4 orchestrator schema. Each is a
 * distinct `payment_method.type` in the request body — this discriminated
 * union is what lets createDirectCharge build the right request shape
 * instead of hard-coding `type: 'card'` the way this file used to.
 *
 * Left out deliberately (not because they're hard, but because nothing in
 * this codebase can validate or exercise them yet): `bank_account` (direct
 * debit from an already-linked account — a different, mandate-based flow,
 * not a one-off top-up), `applepay`/`googlepay`/`opay`/`paypal`.
 */
export type FlutterwavePaymentMethod =
  | { type: 'card'; card: { number: string; expiryMonth: string; expiryYear: string; cvv: string; holderName?: string } }
  // Ghana/Kenya only in this app today (lib/payments/currency.ts's supported
  // non-NGN currencies) — country_code/network/phone_number per developer.
  // flutterwave.com/docs/payment-orchestrator-flow's mobile_money example.
  | { type: 'mobile_money'; mobileMoney: { network: string; countryCode: string; phoneNumber: string } }
  // Nigeria only — `accountBank` is the payer's own bank's NIP code (e.g.
  // "044" for Access Bank), per the documented `^\d{3,}$` pattern; see
  // lib/payments/flutterwave-options.ts for the list surfaced in the form.
  | { type: 'ussd'; ussd: { accountBank: string } }
  // "Pay With Bank Transfer" — Flutterwave generates a one-time virtual
  // account for the payer to transfer the exact amount into. No sensitive
  // input needed from the payer at charge-creation time (unlike the other
  // three methods), which is what makes it the simplest non-card option to
  // offer. `account_type: 'dynamic'` (a fresh account per charge, expiring)
  // rather than 'static' (a reusable account) — the right choice for a
  // one-off top-up, not a subscription.
  | { type: 'bank_transfer' };

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
  // Mobile money's "authorize on your phone", USSD's dial code, and bank
  // transfer's generated account are all the same shape from our side: no
  // redirect to send the payer to, just instructions to show them and wait.
  // Resolves later via the webhook or the billing callback page's
  // getCharge() poll, same as any other 'pending' payment.
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
    case 'bank_transfer':
      return { type: 'bank_transfer', pwbt: { account_type: 'dynamic' } };
  }
}

/** POST /orchestration/direct-charges — the single-call orchestrator flow (combines customer + payment method + charge creation), per developer.flutterwave.com/reference/orchestration_direct_charge_post. */
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
    // method's own phone exactly (developer.flutterwave.com/docs/payment-
    // orchestrator-flow: "the customer object must include matching phone
    // details") — derive it from the same source rather than trust two
    // separate call-site values to agree.
    const customerPhone =
      params.paymentMethod.type === 'mobile_money'
        ? { countryCode: params.paymentMethod.mobileMoney.countryCode, number: params.paymentMethod.mobileMoney.phoneNumber }
        : params.customerPhone;

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
          ...(customerPhone ? { phone: { country_code: customerPhone.countryCode, number: customerPhone.number } } : {}),
        },
        payment_method: buildPaymentMethodBody(params.paymentMethod, encryptedCard),
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
    // USSD's dial code, and mobile money's "approve on your phone" prompt —
    // both carry their customer-facing text in next_action.payment_
    // instruction.note per developer.flutterwave.com/docs/payment-
    // orchestrator-flow.
    if (nextAction?.type === 'payment_instruction' && nextAction.payment_instruction?.note) {
      return { outcome: 'pending_instructions', chargeId, instructions: nextAction.payment_instruction.note };
    }
    // Bank transfer's generated virtual account — per developer.flutterwave.
    // com/docs/bank-transfer's requires_bank_transfer next_action shape.
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
        message: "This mobile money network requires QR-code confirmation, which isn't supported yet — try USSD, card, bank transfer, or a different mobile network.",
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
      // The async methods added alongside multi-method support (USSD,
      // mobile money, bank transfer) all have a real "waiting on the payer"
      // window a card charge rarely does, and v4 can send an intermediate
      // webhook while that's happening. Only a final 'success' or an
      // explicit failure/expiry status is meaningful here — anything else
      // (e.g. 'pending') is deliberately ignored (returns null) rather than
      // mapped to 'failed', so a payment mid-flight is never marked failed
      // just because an intermediate event arrived. lib/payments/confirm.ts's
      // confirmFlutterwaveChargeByReference (the billing callback page's own
      // getCharge() poll) is the fallback that eventually resolves it either
      // way.
      if (!['success', 'failed', 'cancelled', 'expired'].includes(data.status)) return null;
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
