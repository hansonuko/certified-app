import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookEvent } from './provider';
import { getProvider } from './index';
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
export async function confirmPaymentByReference(
  admin: SupabaseClient,
  provider: 'flutterwave' | 'paystack',
  reference: string,
): Promise<{ status: 'success' | 'failed' | 'pending' | 'not_found' | 'error'; message?: string }> {
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

  await applyConfirmedSuccess(admin, payment, event.amount, event.currency);
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
): Promise<{ status: 'success' | 'failed'; message?: string }> {
  // Never trust the provider's reported amount/currency blindly — compare
  // against what this checkout was actually created for. A mismatch here
  // would mean either a provider-side rounding surprise or, worse, a
  // tampered/replayed webhook — either way, don't credit, and leave the
  // payment in a state a human can investigate rather than silently
  // marking it 'failed' (which would let the payer retry and get charged
  // twice for the same intent).
  const amountMatches = Math.abs(reportedAmount - Number(payment.amount)) < 1;
  const currencyMatches = reportedCurrency === payment.currency;
  if (!amountMatches || !currencyMatches) {
    console.error(
      `Payment ${payment.id}: reported ${reportedAmount} ${reportedCurrency} does not match expected ${payment.amount} ${payment.currency} — not crediting, left pending for manual review.`,
    );
    return { status: 'failed', message: 'Amount/currency mismatch — left pending for manual review.' };
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
