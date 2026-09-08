import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * "₦1,000 or its equivalent amount for other African countries" — resolved
 * via a small admin-editable rate table (supabase/migrations/0030's
 * payment_currency_rates) rather than a live FX feed, same v1 shortcut
 * already used for directory location data (lib/geo/africa.ts: solve it for
 * the priority countries first, free-text/fallback elsewhere). Rates are
 * seeded with deliberately rough placeholder values the migration itself
 * flags as needing verification — this file never pretends otherwise.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  Nigeria: 'NGN',
  Ghana: 'GHS',
  Kenya: 'KES',
  'South Africa': 'ZAR',
};

const FALLBACK_CURRENCY = 'USD';

// Fallback only — used if payment_currency_rates is ever unreadable, so a
// transient failure degrades to "charge in NGN" rather than blocking a
// purchase outright.
const FALLBACK_NGN_RATE: Record<string, number> = { NGN: 1 };

export function resolveCurrencyForCountry(country: string | null | undefined): string {
  return (country && CURRENCY_BY_COUNTRY[country]) || FALLBACK_CURRENCY;
}

export async function getNgnRate(supabase: SupabaseClient, currency: string): Promise<number> {
  const { data } = await supabase
    .from('payment_currency_rates')
    .select('ngn_rate')
    .eq('currency', currency)
    .maybeSingle();

  if (data) return Number(data.ngn_rate);
  return FALLBACK_NGN_RATE[currency] ?? FALLBACK_NGN_RATE.NGN;
}

/** Converts an NGN-anchored amount into the target currency's smallest sensible display unit (not cents/kobo — see provider adapters for minor-unit handling). */
export function convertFromNgn(amountNgn: number, ngnRate: number): number {
  return Math.round(amountNgn * ngnRate * 100) / 100;
}
