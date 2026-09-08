import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Certificate-credit pricing (Monetization Flow A, docs/build-phases.md
 * Phase 11 item 1). Base unit price is a code constant — only the discount
 * tiers are admin-configurable (supabase/migrations/0030's
 * certificate_credit_pricing_tiers, per the user's explicit request that
 * discount percentages be adjustable "at any given time" without a
 * redeploy). Currency conversion is a separate concern, see currency.ts.
 */
export const BASE_UNIT_PRICE_NGN = 1000;

export type PricingTier = { minQuantity: number; maxQuantity: number | null; discountPercent: number };

// Fallback only — used if the pricing_tiers table is ever empty (shouldn't
// happen post-migration, since 0030 seeds it), so a transient read failure
// degrades to "no discount" rather than blocking every purchase outright.
const FALLBACK_TIERS: PricingTier[] = [
  { minQuantity: 1, maxQuantity: 1, discountPercent: 0 },
  { minQuantity: 2, maxQuantity: 19, discountPercent: 30 },
  { minQuantity: 20, maxQuantity: null, discountPercent: 50 },
];

export async function getPricingTiers(supabase: SupabaseClient): Promise<PricingTier[]> {
  const { data } = await supabase
    .from('certificate_credit_pricing_tiers')
    .select('min_quantity, max_quantity, discount_percent')
    .order('min_quantity', { ascending: true });

  if (!data || data.length === 0) return FALLBACK_TIERS;

  return data.map((row) => ({
    minQuantity: row.min_quantity,
    maxQuantity: row.max_quantity,
    discountPercent: Number(row.discount_percent),
  }));
}

export function findTierForQuantity(tiers: PricingTier[], quantity: number): PricingTier {
  const match = tiers.find((t) => quantity >= t.minQuantity && (t.maxQuantity === null || quantity <= t.maxQuantity));
  // Falls back to the highest-quantity tier's discount if a caller somehow
  // requests more than every tier's upper bound covers (shouldn't happen —
  // the top tier is always open-ended — but never silently apply 0%).
  return match ?? tiers[tiers.length - 1] ?? FALLBACK_TIERS[FALLBACK_TIERS.length - 1];
}

export type CreditPurchaseQuote = {
  quantity: number;
  unitPriceNgn: number;
  discountPercent: number;
  totalNgn: number;
};

/**
 * The one place "how much does N credits cost" is computed — called
 * server-side only, at checkout-creation time, from the quantity the client
 * submitted. Never trust a client-supplied price (docs/build-phases.md
 * Phase 11's own scoping conversation flagged this explicitly: a
 * manipulated request could otherwise ask to credit 100 for the price of 1).
 */
export function quoteCreditPurchase(quantity: number, tiers: PricingTier[]): CreditPurchaseQuote {
  const tier = findTierForQuantity(tiers, quantity);
  const unitPriceNgn = Math.round(BASE_UNIT_PRICE_NGN * (1 - tier.discountPercent / 100));
  return {
    quantity,
    unitPriceNgn,
    discountPercent: tier.discountPercent,
    totalNgn: unitPriceNgn * quantity,
  };
}
