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
import { createDirectCharge, type FlutterwavePaymentMethod } from '@/lib/payments/flutterwave';
import { isKnownMobileMoneyNetwork, isKnownUssdBankCode } from '@/lib/payments/flutterwave-options';
import { confirmFlutterwaveChargeByReference } from '@/lib/payments/confirm';

export type BuyCreditsState = { error: string } | { instructions: string } | null;

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
  paymentMethod?: 'card' | 'mobile_money' | 'ussd' | 'bank_transfer',
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
    payment_method: paymentMethod ?? null,
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
 * Reads and validates whichever Flutterwave payment method the issuer chose
 * (BuyCreditsForm.tsx's `flutterwave_method` field) into the discriminated
 * union lib/payments/flutterwave.ts's createDirectCharge expects. Card
 * fields are validated exactly as before; mobile money/USSD are checked
 * against the fixed option lists in lib/payments/flutterwave-options.ts so a
 * tampered or stale client value can't reach Flutterwave as an unrecognized
 * network/bank code. Bank transfer needs no payer-supplied fields at all.
 */
function readFlutterwaveMethod(formData: FormData): { method: FlutterwavePaymentMethod } | { error: string } {
  const type = (formData.get('flutterwave_method') as string | null) ?? 'card';

  if (type === 'card') {
    const cardNumber = (formData.get('card_number') as string | null)?.replace(/\s+/g, '') ?? '';
    const expiryMonth = (formData.get('expiry_month') as string | null)?.trim() ?? '';
    const expiryYear = (formData.get('expiry_year') as string | null)?.trim() ?? '';
    const cvv = (formData.get('cvv') as string | null)?.trim() ?? '';
    const holderName = (formData.get('card_holder_name') as string | null)?.trim() || undefined;

    if (!/^\d{12,19}$/.test(cardNumber)) return { error: 'Enter a valid card number.' };
    if (!/^\d{1,2}$/.test(expiryMonth) || Number(expiryMonth) < 1 || Number(expiryMonth) > 12) return { error: 'Enter a valid expiry month.' };
    if (!/^\d{2,4}$/.test(expiryYear)) return { error: 'Enter a valid expiry year.' };
    if (!/^\d{3,4}$/.test(cvv)) return { error: 'Enter a valid CVV.' };

    return { method: { type: 'card', card: { number: cardNumber, expiryMonth, expiryYear, cvv, holderName } } };
  }

  if (type === 'mobile_money') {
    const network = (formData.get('mobile_money_network') as string | null)?.trim() ?? '';
    const countryCode = (formData.get('mobile_money_country_code') as string | null)?.trim() ?? '';
    const phoneNumber = (formData.get('mobile_money_phone') as string | null)?.replace(/\D/g, '') ?? '';

    if (!isKnownMobileMoneyNetwork(network, countryCode)) return { error: 'Select a supported mobile money network.' };
    if (!/^\d{7,12}$/.test(phoneNumber)) return { error: 'Enter a valid mobile money phone number.' };

    return { method: { type: 'mobile_money', mobileMoney: { network, countryCode, phoneNumber } } };
  }

  if (type === 'ussd') {
    const accountBank = (formData.get('ussd_bank') as string | null)?.trim() ?? '';
    if (!isKnownUssdBankCode(accountBank)) return { error: 'Select your bank.' };
    return { method: { type: 'ussd', ussd: { accountBank } } };
  }

  if (type === 'bank_transfer') {
    return { method: { type: 'bank_transfer' } };
  }

  return { error: 'Select a payment method.' };
}

/** Mobile money/USSD only make sense in the currency Flutterwave actually offers them for (lib/payments/flutterwave-options.ts) — cross-checked against the org's own resolved billing currency, not trusted from which sub-form the client happened to submit. */
function methodMatchesCurrency(method: FlutterwavePaymentMethod, currency: string): boolean {
  if (method.type === 'mobile_money') {
    return (method.mobileMoney.countryCode === '233' && currency === 'GHS') || (method.mobileMoney.countryCode === '254' && currency === 'KES');
  }
  if (method.type === 'ussd') return currency === 'NGN';
  return true; // card and bank transfer aren't currency-restricted in this app
}

/**
 * Flutterwave v4's direct-charge flow (lib/payments/flutterwave.ts) —
 * dispatches to whichever payment method the issuer picked (card, mobile
 * money, USSD, or bank transfer). Card details are collected on our own
 * page and encrypted here, server-side, immediately: this action never
 * logs raw card fields, never stores them (not even transiently in a DB
 * row), and discards them from memory as soon as createDirectCharge
 * returns. The other three methods carry no card-equivalent secret.
 */
export async function initiateFlutterwaveCharge(_prev: BuyCreditsState, formData: FormData): Promise<BuyCreditsState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();
  const admin = createAdminClient();

  const quantity = readQuantity(formData);
  if (quantity === null) return { error: 'Enter a whole number of certificate credits (1 or more).' };

  const parsedMethod = readFlutterwaveMethod(formData);
  if ('error' in parsedMethod) return parsedMethod;
  const { method } = parsedMethod;

  const quote = await quoteAndRecordPendingPurchase(supabase, orgId, quantity, 'flutterwave', method.type);
  if ('error' in quote) return quote;

  if (!methodMatchesCurrency(method, quote.currency)) {
    return { error: 'That payment method isn\'t available for your organization\'s billing currency — try card or bank transfer instead.' };
  }

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
    // every non-Nigerian org. (Mobile money supplies its own phone/country
    // code instead — see createDirectCharge's own handling of that case.)
    redirectUrl,
    paymentMethod: method,
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
  if (result.outcome === 'pending_instructions') {
    return { instructions: result.instructions };
  }
  if (result.outcome === 'requires_unsupported_authorization') {
    return {
      error: `This card requires ${result.authorizationType} authentication, which isn't supported yet — try a different card, or use Paystack.`,
    };
  }
  return { error: result.message };
}
