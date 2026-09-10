import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import type { PaymentProvider, WebhookEvent } from './provider';
import { encryptCard } from './flutterwave-crypto';
import { API_BASE, requireEnv, parseJsonResponse, getAccessToken } from './flutterwave-client';

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
 *
 * **Update — Opay and bank_account added.** A direct fetch of Flutterwave's
 * own OpenAPI reference (developer.flutterwave.com/reference/
 * orchestration_direct_charge_post, .md suffix for the raw content) —
 * higher-confidence than the third-party cross-referencing above, since
 * it's the provider's own schema rather than someone else's integration —
 * confirms the `payment_method.type` union really is `card | bank_account |
 * mobile_money | opay | applepay | googlepay | ussd` and that both `opay`
 * and `bank_account` request with an empty body object (see the union's own
 * comment below). This is still no substitute for a live test: same
 * "unverified end-to-end" caveat as everything else in this file.
 */

/**
 * The payment methods this integration supports as directly-requestable
 * `payment_method.type` values on POST /orchestration/direct-charges — see
 * this file's header for why `bank_transfer` isn't one of them despite
 * being a real v4 concept (that's `lib/payments/flutterwave-virtual-
 * accounts.ts` instead — a different pair of endpoints entirely, not this
 * one).
 *
 * `opay` and `bank_account` both request with an empty body object — the
 * type discriminator alone is the whole request; Flutterwave returns a
 * `next_action.redirect_url` for the payer to authorize on (OPay's app, or
 * Mono's bank-selection page for `bank_account`), the same redirect shape
 * card's 3DS step already uses below. Both are NGN-only per Flutterwave's
 * own docs (developer.flutterwave.com/docs/opay,
 * developer.flutterwave.com/docs/ng-bank-account) — enforced by
 * `methodMatchesCurrency` in app/dashboard/billing/actions.ts, not here.
 *
 * Left out deliberately (not because they're hard, but because nothing in
 * this codebase can validate or exercise them yet): `applepay`/`googlepay`
 * (need native wallet integration on the client this app doesn't have).
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
  | { type: 'ussd'; ussd: { accountBank: string } }
  // Nigeria only. OPay's own app handles authorization after the redirect —
  // nothing else to collect on our side.
  | { type: 'opay' }
  // Nigeria only. "Pay with Bank" — an instant NGN bank-account debit via
  // Flutterwave's Mono-powered redirect flow: the payer picks their bank and
  // authorizes (internet banking, OTP, or their bank's own USSD code) on
  // Mono's page, not ours. Nothing to collect here either.
  | { type: 'bank_account' };

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
    case 'opay':
      return { type: 'opay', opay: {} };
    case 'bank_account':
      return { type: 'bank_account', bank_account: {} };
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
