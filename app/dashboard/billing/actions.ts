'use server';

import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPricingTiers, quoteCreditPurchase } from '@/lib/payments/pricing';
import { resolveCurrencyForCountry, getNgnRate, convertFromNgn } from '@/lib/payments/currency';
import { generatePaymentReference } from '@/lib/payments/reference';
import { getProvider, isProviderId, type ProviderId } from '@/lib/payments';
import { createDirectCharge } from '@/lib/payments/flutterwave';
import { confirmFlutterwaveChargeByReference } from '@/lib/payments/confirm';

export type BuyCreditsState = { error: string } | null;

type PendingPurchaseQuote = {
  reference: string;
  amount: number;
  currency: string;
  unitPrice: number;
  discountPercent: number;
  org: { display_name: string; owner_email: string; owner_phone: string | null };
};

/**
 * Shared by both checkout flows below: computes the price server-side from
 * the submitted quantity — never trusted from the client, per the scoping
 * conversation this phase was built from — and inserts the 'pending'
 * payments row both flows need a reference for. Kept in one place so the
 * pricing/currency logic can't drift between Paystack's redirect flow and
 * Flutterwave's card-charge flow.
 */
async function quoteAndRecordPendingPurchase(
  supabase: SupabaseClient,
  orgId: string,
  quantity: number,
  provider: ProviderId,
): Promise<PendingPurchaseQuote | { error: string }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('address_country, owner_email, owner_phone, display_name')
    .eq('id', orgId)
    .single();
  if (!org) return { error: 'Organization not found.' };

  const tiers = await getPricingTiers(supabase);
  const quote = quoteCreditPurchase(quantity, tiers);
  const currency = resolveCurrencyForCountry(org.address_country);
  const ngnRate = currency === 'NGN' ? 1 : await getNgnRate(supabase, currency);
  const unitPrice = currency === 'NGN' ? quote.unitPriceNgn : convertFromNgn(quote.unitPriceNgn, ngnRate);
  const amount = currency === 'NGN' ? quote.totalNgn : convertFromNgn(quote.totalNgn, ngnRate);
  const reference = generatePaymentReference('CREDITS');

  const { error: insertError } = await supabase.from('payments').insert({
    org_id: orgId,
    purpose: 'certificate_credits',
    provider,
    provider_reference: reference,
    quantity,
    unit_price: unitPrice,
    discount_percent: quote.discountPercent,
    amount,
    currency,
    status: 'pending',
  });
  if (insertError) return { error: `Could not start checkout: ${insertError.message}` };

  return {
    reference,
    amount,
    currency,
    unitPrice,
    discountPercent: quote.discountPercent,
    org: { display_name: org.display_name, owner_email: org.owner_email, owner_phone: org.owner_phone },
  };
}

function readQuantity(formData: FormData): number | null {
  const quantity = Number(formData.get('quantity'));
  return Number.isInteger(quantity) && quantity >= 1 ? quantity : null;
}

/** Paystack's hosted-checkout-redirect flow. */
export async function initiateCreditPurchase(_prev: BuyCreditsState, formData: FormData): Promise<BuyCreditsState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const quantity = readQuantity(formData);
  if (quantity === null) return { error: 'Enter a whole number of certificate credits (1 or more).' };

  const quote = await quoteAndRecordPendingPurchase(supabase, orgId, quantity, 'paystack');
  if ('error' in quote) return quote;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUrl = `${appUrl}/dashboard/billing/callback?reference=${encodeURIComponent(quote.reference)}&provider=paystack`;

  const checkout = await getProvider('paystack').createCheckout({
    reference: quote.reference,
    amount: quote.amount,
    currency: quote.currency,
    customerEmail: quote.org.owner_email,
    redirectUrl,
    description: `${quantity} certificate credit${quantity === 1 ? '' : 's'} — ${quote.org.display_name}`,
  });
  if ('error' in checkout) return { error: checkout.error };

  redirect(checkout.checkoutUrl);
}

/**
 * Flutterwave v4's card-charge flow (lib/payments/flutterwave.ts) — card
 * details are collected on our own page (FlutterwaveCardForm.tsx) and
 * encrypted here, server-side, immediately: this action never logs the raw
 * card fields, never stores them (not even transiently in a DB row), and
 * discards them from memory as soon as createDirectCharge returns.
 */
export async function initiateFlutterwaveCharge(_prev: BuyCreditsState, formData: FormData): Promise<BuyCreditsState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();
  const admin = createAdminClient();

  const quantity = readQuantity(formData);
  if (quantity === null) return { error: 'Enter a whole number of certificate credits (1 or more).' };

  const cardNumber = (formData.get('card_number') as string | null)?.replace(/\s+/g, '') ?? '';
  const expiryMonth = (formData.get('expiry_month') as string | null)?.trim() ?? '';
  const expiryYear = (formData.get('expiry_year') as string | null)?.trim() ?? '';
  const cvv = (formData.get('cvv') as string | null)?.trim() ?? '';
  const holderName = (formData.get('card_holder_name') as string | null)?.trim() || undefined;

  if (!/^\d{12,19}$/.test(cardNumber)) return { error: 'Enter a valid card number.' };
  if (!/^\d{1,2}$/.test(expiryMonth) || Number(expiryMonth) < 1 || Number(expiryMonth) > 12) return { error: 'Enter a valid expiry month.' };
  if (!/^\d{2,4}$/.test(expiryYear)) return { error: 'Enter a valid expiry year.' };
  if (!/^\d{3,4}$/.test(cvv)) return { error: 'Enter a valid CVV.' };

  const quote = await quoteAndRecordPendingPurchase(supabase, orgId, quantity, 'flutterwave');
  if ('error' in quote) return quote;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUrl = `${appUrl}/dashboard/billing/callback?reference=${encodeURIComponent(quote.reference)}&provider=flutterwave`;

  const [firstName, ...rest] = quote.org.display_name.split(' ');
  const result = await createDirectCharge({
    reference: quote.reference,
    amount: quote.amount,
    currency: quote.currency,
    customerEmail: quote.org.owner_email,
    customerName: { first: firstName || quote.org.display_name, last: rest.join(' ') || firstName || quote.org.display_name },
    // Phone is optional in Flutterwave's schema and we don't have a
    // reliable country-calling-code lookup for owner_phone (it's stored
    // however the applicant typed it at /apply, not normalized to E.164) —
    // omitting it beats guessing a country code, which would be wrong for
    // every non-Nigerian org.
    redirectUrl,
    card: { number: cardNumber, expiryMonth, expiryYear, cvv, holderName },
  });

  // Record the Flutterwave charge id right away, whatever the outcome, so
  // the billing callback page (and the webhook) can look this payment back
  // up (supabase/migrations/0031 — v4 has no "verify by our own reference"
  // endpoint, only GET /charges/{id}).
  if ('chargeId' in result && result.chargeId) {
    await admin.from('payments').update({ provider_charge_id: result.chargeId }).eq('provider_reference', quote.reference);
  }

  if (result.outcome === 'redirect_required') {
    redirect(result.redirectUrl);
  }
  if (result.outcome === 'success') {
    await confirmFlutterwaveChargeByReference(admin, quote.reference);
    redirect(`/dashboard/billing/callback?reference=${encodeURIComponent(quote.reference)}&provider=flutterwave`);
  }
  if (result.outcome === 'requires_unsupported_authorization') {
    return {
      error: `This card requires ${result.authorizationType} authentication, which isn't supported yet — try a different card, or use Paystack.`,
    };
  }
  return { error: result.message };
}
