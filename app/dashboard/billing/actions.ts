'use server';

import { redirect } from 'next/navigation';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { getPricingTiers, quoteCreditPurchase } from '@/lib/payments/pricing';
import { resolveCurrencyForCountry, getNgnRate, convertFromNgn } from '@/lib/payments/currency';
import { generatePaymentReference } from '@/lib/payments/reference';
import { getProvider, isProviderId } from '@/lib/payments';

export type BuyCreditsState = { error: string } | null;

/**
 * Starts a credit-purchase checkout (Monetization Flow A, docs/build-
 * phases.md Phase 11 item 1). Price is always computed here, server-side,
 * from the submitted quantity and the current DB-backed pricing tiers/
 * currency rate — never from anything the client sends as a price, per the
 * scoping conversation this phase was built from (a client-supplied amount
 * would be trivial to tamper with).
 */
export async function initiateCreditPurchase(_prev: BuyCreditsState, formData: FormData): Promise<BuyCreditsState> {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const quantity = Number(formData.get('quantity'));
  const providerId = formData.get('provider');

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: 'Enter a whole number of certificate credits (1 or more).' };
  }
  if (typeof providerId !== 'string' || !isProviderId(providerId)) {
    return { error: 'Choose a payment provider.' };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('address_country, owner_email, display_name')
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
    provider: providerId,
    provider_reference: reference,
    quantity,
    unit_price: unitPrice,
    discount_percent: quote.discountPercent,
    amount,
    currency,
    status: 'pending',
  });

  if (insertError) return { error: `Could not start checkout: ${insertError.message}` };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUrl = `${appUrl}/dashboard/billing/callback?reference=${encodeURIComponent(reference)}&provider=${providerId}`;

  const checkout = await getProvider(providerId).createCheckout({
    reference,
    amount,
    currency,
    customerEmail: org.owner_email,
    redirectUrl,
    description: `${quantity} certificate credit${quantity === 1 ? '' : 's'} — ${org.display_name}`,
  });

  if ('error' in checkout) return { error: checkout.error };

  redirect(checkout.checkoutUrl);
}
