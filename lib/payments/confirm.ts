import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookEvent } from './provider';
import { getProvider } from './index';
import { getCharge } from './flutterwave';
import { addCertificateCredits } from './credits';

/**
 * The one place a payment actually gets applied (org credited, row marked
 * success/failed) — called from two places, same "shared function, two
 * triggers" shape as lib/bulk-issuance/processor.ts's advanceJob():
 *
 * 1. The provider's webhook (app/api/webhooks/flutterwave|paystack) — the
 *    real, primary path.
 * 2. The billing callback page's own fallback verify
 *    (app/dashboard/billing/callback/page.tsx), calling the provider's
 *    verifyTransaction() directly — a pragmatic resilience addition in case
 *    the webhook is slow or never arrives, exactly like the bulk-issuance
 *    status page's opportunistic advanceJob() call.
 *
 * Idempotent: a payment already resolved (success or failed) is a no-op —
 * both a webhook that fires twice and a page view landing after the webhook
 * already ran must never double-credit the same purchase.
 *
 * `admin` is always a service-role client — this is the only code path
 * allowed to move payments.status out of 'pending' or call
 * add_certificate_credits().
 */
export type ConfirmResult = { status: 'success' | 'failed' | 'pending' | 'not_found' | 'error' | 'mismatch'; message?: string };

export async function confirmPaymentByReference(
  admin: SupabaseClient,
  provider: 'flutterwave' | 'paystack',
  reference: string,
): Promise<ConfirmResult> {
  const { data: payment } = await admin
    .from('payments')
    .select('id, org_id, status, quantity, unit_price, discount_percent, amount, currency, purpose')
    .eq('provider_reference', reference)
    .eq('provider', provider)
    .maybeSingle();

  if (!payment) return { status: 'not_found' };
  if (payment.status !== 'pending') return { status: payment.status as 'success' | 'failed' };

  const result = await getProvider(provider).verifyTransaction(reference);
  if ('error' in result) return { status: 'error', message: result.error };
  if (result.status === 'pending') return { status: 'pending' };
  if (result.status === 'failed') {
    await admin.from('payments').update({ status: 'failed', confirmed_at: new Date().toISOString() }).eq('id', payment.id);
    return { status: 'failed' };
  }

  return applyConfirmedSuccess(admin, payment, result.amount, result.currency);
}

/**
 * Flutterwave-v4-specific counterpart to confirmPaymentByReference above —
 * v4 has no "verify by our own reference" endpoint, only GET /charges/{id}
 * using Flutterwave's own charge id (payments.provider_charge_id,
 * supabase/migrations/0031, stored right after the charge was created in
 * app/dashboard/billing/actions.ts). Shares the same idempotency and
 * amount/currency-check guarantees via applyConfirmedSuccess below.
 */
export async function confirmFlutterwaveChargeByReference(admin: SupabaseClient, reference: string): Promise<ConfirmResult> {
  const { data: payment } = await admin
    .from('payments')
    .select('id, org_id, status, quantity, unit_price, discount_percent, amount, currency, purpose, provider_charge_id')
    .eq('provider_reference', reference)
    .eq('provider', 'flutterwave')
    .maybeSingle();

  if (!payment) return { status: 'not_found' };
  if (payment.status !== 'pending') return { status: payment.status as 'success' | 'failed' };
  if (!payment.provider_charge_id) return { status: 'pending' }; // charge creation hadn't recorded an id yet

  const result = await getCharge(payment.provider_charge_id);
  if ('error' in result) return { status: 'error', message: result.error };
  if (result.status === 'pending') return { status: 'pending' };
  if (result.status === 'failed') {
    await admin.from('payments').update({ status: 'failed', confirmed_at: new Date().toISOString() }).eq('id', payment.id);
    return { status: 'failed' };
  }

  return applyConfirmedSuccess(admin, payment, result.amount, result.currency);
}

export async function confirmPaymentFromWebhookEvent(
  admin: SupabaseClient,
  provider: 'flutterwave' | 'paystack',
  event: WebhookEvent,
): Promise<void> {
  const { data: payment } = await admin
    .from('payments')
    .select('id, org_id, status, quantity, unit_price, discount_percent, amount, currency, purpose')
    .eq('provider_reference', event.reference)
    .eq('provider', provider)
    .maybeSingle();

  if (!payment || payment.status !== 'pending') return; // unknown reference, or already resolved — nothing to do

  if (event.status === 'failed') {
    await admin.from('payments').update({ status: 'failed', confirmed_at: new Date().toISOString() }).eq('id', payment.id);
    return;
  }

  const result = await applyConfirmedSuccess(admin, payment, event.amount, event.currency);
  if (result.status === 'mismatch') {
    console.error(`Webhook for payment ${payment.id} (${provider}) hit an amount/currency mismatch — see applyConfirmedSuccess's own log line above.`);
  }
}

type PendingPaymentRow = {
  id: string;
  org_id: string;
  status: string;
  quantity: number | null;
  unit_price: number | null;
  discount_percent: number | null;
  amount: number;
  currency: string;
  purpose: string;
};

async function applyConfirmedSuccess(
  admin: SupabaseClient,
  payment: PendingPaymentRow,
  reportedAmount: number,
  reportedCurrency: string,
): Promise<ConfirmResult> {
  // Never trust the provider's reported amount/currency blindly — compare
  // against what this checkout was actually created for. A mismatch here
  // would mean either a provider-side rounding surprise or, worse, a
  // tampered/replayed webhook — either way, don't credit, and leave the
  // payment row genuinely `pending` in the DB (not silently marked
  // 'failed') so a human can investigate. Returning a distinct 'mismatch'
  // status here — not 'failed' — matters: a real successful charge that
  // trips this guard on a false positive (e.g. a units-format assumption
  // that turns out wrong) must never be told "payment failed" to the payer,
  // which would risk them paying a second time while the first charge sits
  // uncredited. /staff/finance/wallets surfaces payments stuck in this
  // state so staff can manually credit once the real charge is confirmed
  // out of band.
  const amountMatches = Math.abs(reportedAmount - Number(payment.amount)) < 1;
  const currencyMatches = reportedCurrency === payment.currency;
  if (!amountMatches || !currencyMatches) {
    console.error(
      `Payment ${payment.id}: reported ${reportedAmount} ${reportedCurrency} does not match expected ${payment.amount} ${payment.currency} — not crediting, left pending for manual review.`,
    );
    return { status: 'mismatch', message: "We couldn't automatically confirm this payment — it hasn't been marked as failed, so please don't pay again. Contact support and we'll verify and credit it manually." };
  }

  if (payment.purpose === 'certificate_credits' && payment.quantity) {
    await addCertificateCredits(admin, {
      orgId: payment.org_id,
      quantity: payment.quantity,
      unitPrice: Number(payment.unit_price ?? 0),
      discountPercent: Number(payment.discount_percent ?? 0),
      totalAmount: Number(payment.amount),
      currency: payment.currency,
      paymentId: payment.id,
    });
  }

  await admin.from('payments').update({ status: 'success', confirmed_at: new Date().toISOString() }).eq('id', payment.id);
  return { status: 'success' };
}
