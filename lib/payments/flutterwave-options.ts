/**
 * Shared option lists for Flutterwave's non-card payment methods
 * (lib/payments/flutterwave.ts) — one source of truth for both the buy-
 * credits form's `<select>` options (BuyCreditsForm.tsx) and the server
 * action's own validation (app/dashboard/billing/actions.ts), so the two
 * can never drift the way a duplicated list risks.
 *
 * Scoped deliberately narrow rather than exhaustive: mobile money is only
 * offered for the two non-Nigerian currencies this app already prices in
 * (lib/payments/currency.ts — GHS/KES), and USSD only for Nigeria, because
 * those are the markets Flutterwave's own docs describe each method for.
 * Network/bank values are written to match developer.flutterwave.com's
 * documented v4 examples as closely as possible, but — like the rest of
 * this integration — have never been exercised against a live sandbox; see
 * lib/payments/flutterwave.ts's own file header.
 */

export type MobileMoneyNetworkOption = { label: string; network: string; countryCode: string };

export const MOBILE_MONEY_NETWORKS_BY_COUNTRY: Record<string, MobileMoneyNetworkOption[]> = {
  Ghana: [
    { label: 'MTN Mobile Money', network: 'MTN', countryCode: '233' },
    { label: 'Vodafone Cash', network: 'VODAFONE', countryCode: '233' },
    { label: 'AirtelTigo Money', network: 'AIRTELTIGO', countryCode: '233' },
  ],
  Kenya: [{ label: 'M-Pesa', network: 'MPESA', countryCode: '254' }],
};

export function getMobileMoneyNetworksForCountry(country: string | null | undefined): MobileMoneyNetworkOption[] {
  return (country && MOBILE_MONEY_NETWORKS_BY_COUNTRY[country]) || [];
}

export function isKnownMobileMoneyNetwork(network: string, countryCode: string): boolean {
  return Object.values(MOBILE_MONEY_NETWORKS_BY_COUNTRY)
    .flat()
    .some((option) => option.network === network && option.countryCode === countryCode);
}

/** Nigerian bank NIP codes, for USSD's `account_bank` field — a fixed, well-known list, not user-editable. */
export const USSD_BANKS: { label: string; code: string }[] = [
  { label: 'Access Bank', code: '044' },
  { label: 'First Bank of Nigeria', code: '011' },
  { label: 'Fidelity Bank', code: '070' },
  { label: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { label: 'United Bank for Africa (UBA)', code: '033' },
  { label: 'Union Bank', code: '032' },
  { label: 'Sterling Bank', code: '232' },
  { label: 'First City Monument Bank (FCMB)', code: '214' },
  { label: 'Wema Bank', code: '035' },
  { label: 'Zenith Bank', code: '057' },
];

export function isKnownUssdBankCode(code: string): boolean {
  return USSD_BANKS.some((bank) => bank.code === code);
}
