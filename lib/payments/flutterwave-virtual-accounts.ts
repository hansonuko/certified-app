import { randomUUID } from 'crypto';
import { API_BASE, parseJsonResponse, getAccessToken } from './flutterwave-client';

/**
 * "Pay with Bank Transfer" (PWBT) — a dynamically generated virtual account
 * number the payer transfers into manually, confirmed later via webhook.
 * Architecturally separate from lib/payments/flutterwave.ts's direct-charge
 * flow: two different endpoints (`POST /customers` then `POST /virtual-
 * accounts`, not `/orchestration/direct-charges`), confirmed against
 * Flutterwave's own OpenAPI reference (developer.flutterwave.com/reference/
 * virtual_accounts_post, customers_create — .md suffix for raw content).
 *
 * **Scoped to NGN only for this first pass**, deliberately narrower than
 * the endpoint itself (which also documents GHS/EGP/KES/MAD/ZAR): KES
 * requires an extra `customer_account_number` field this codebase has no
 * verified meaning for yet, and GHS/ZAR/EGP/MAD are unverified in every
 * other way an untested field would be. NGN needs nothing beyond what's
 * built here — same "start narrow, expand later" scoping this file's
 * mobile-money support already uses for GHS/KES (lib/payments/flutterwave-
 * options.ts). Enforced in app/dashboard/billing/actions.ts, not here.
 *
 * **Important gap, flagged plainly rather than silently shipped**: a
 * virtual account's own `GET /virtual-accounts/{id}` status field only
 * reflects the account's active/inactive *lifecycle*, never whether a
 * transfer has actually landed (confirmed against the same OpenAPI
 * reference) — there is no polling fallback for this method the way
 * lib/payments/flutterwave.ts's getCharge() gives card/mobile money/USSD/
 * opay/bank_account. A completed transfer is only ever learned about via
 * the `charge.completed` webhook. **This means a virtual-account top-up
 * cannot confirm at all while `FLUTTERWAVE_WEBHOOK_SECRET_HASH` stays unset
 * and no webhook is configured on the Flutterwave dashboard**
 * (docs/session-handoff.md §22) — it will sit `pending` indefinitely,
 * recoverable only via /staff/finance/wallets' manual adjustment (the same
 * safety net that already exists for any stuck payment). Set up that
 * webhook before this method ever serves a real payer.
 *
 * STILL UNVERIFIED end-to-end against a live call, like the rest of this
 * integration — see lib/payments/flutterwave.ts's file header.
 */

export type CreateVirtualAccountParams = {
  reference: string; // matches payments.provider_reference, so the eventual charge.completed webhook (which echoes it back per Flutterwave's docs) resolves the same row lib/payments/confirm.ts already looks up by reference.
  amount: number;
  currency: 'NGN';
  customerEmail: string;
  customerName?: { first: string; last: string };
  narration: string;
};

export type CreateVirtualAccountResult =
  | { accountNumber: string; bankName: string; expiresAt: string | null }
  | { error: string };

// A one-off top-up shouldn't generate an account number valid forever
// against a price quote that may have gone stale — 24h comfortably covers a
// same-day bank transfer without leaving indefinitely-payable stale quotes
// around. Within the documented 60–31,536,000 second range.
const VIRTUAL_ACCOUNT_EXPIRY_SECONDS = 60 * 60 * 24;

async function getOrCreateCustomerId(email: string, name?: { first: string; last: string }): Promise<{ customerId: string } | { error: string }> {
  const accessToken = await getAccessToken();

  const createRes = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Trace-Id': randomUUID() },
    body: JSON.stringify({ email, ...(name ? { name } : {}) }),
  });
  const created = await parseJsonResponse(createRes);
  if (!created.ok) return { error: created.error };

  if (createRes.status === 409) {
    // Customer already exists for this email — look it up rather than fail
    // the whole top-up over a record that already exists on Flutterwave's
    // side (developer.flutterwave.com/reference/customers_search).
    const searchRes = await fetch(`${API_BASE}/customers/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Trace-Id': randomUUID() },
      body: JSON.stringify({ email }),
    });
    const searched = await parseJsonResponse(searchRes);
    if (!searched.ok) return { error: searched.error };
    const existingId = searched.json?.data?.[0]?.id;
    if (!searchRes.ok || !existingId) {
      return { error: searched.json?.message || 'Could not look up existing Flutterwave customer.' };
    }
    return { customerId: existingId };
  }

  if (!createRes.ok || !created.json?.data?.id) {
    return { error: created.json?.message || `Could not create a Flutterwave customer (HTTP ${createRes.status}).` };
  }
  return { customerId: created.json.data.id };
}

/** POST /virtual-accounts — generates a dynamic (single-use, reference-tied) account number for the payer to transfer into. */
export async function createVirtualAccount(params: CreateVirtualAccountParams): Promise<CreateVirtualAccountResult> {
  try {
    const customer = await getOrCreateCustomerId(params.customerEmail, params.customerName);
    if ('error' in customer) return { error: customer.error };

    const accessToken = await getAccessToken();
    const res = await fetch(`${API_BASE}/virtual-accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Trace-Id': randomUUID(),
        'X-Idempotency-Key': params.reference,
      },
      body: JSON.stringify({
        reference: params.reference,
        customer_id: customer.customerId,
        currency: params.currency,
        account_type: 'dynamic',
        amount: params.amount,
        narration: params.narration,
        expiry: VIRTUAL_ACCOUNT_EXPIRY_SECONDS,
      }),
    });
    const parsed = await parseJsonResponse(res);
    if (!parsed.ok) return { error: parsed.error };
    const json = parsed.json;

    if (!res.ok || !json.data?.account_number) {
      return { error: json.message || json.error?.message || `Could not create a virtual account (HTTP ${res.status}).` };
    }

    return {
      accountNumber: json.data.account_number,
      bankName: json.data.account_bank_name,
      expiresAt: json.data.account_expiration_datetime ?? null,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Flutterwave virtual account request failed.' };
  }
}
