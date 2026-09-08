import type { PaymentProvider, ProviderId } from './provider';
import { paystackProvider } from './paystack';

// Flutterwave is intentionally NOT registered here — v4 doesn't implement
// the hosted-checkout-redirect PaymentProvider interface the way v3/
// Paystack do (see lib/payments/flutterwave.ts's file header). Its
// card-charge flow is called directly from app/dashboard/billing/actions.ts
// (createDirectCharge) rather than through getProvider(). This map only
// ever needs to hold providers that actually implement the shared
// interface end to end.
const PROVIDERS: Partial<Record<ProviderId, PaymentProvider>> = {
  paystack: paystackProvider,
};

export function getProvider(id: ProviderId): PaymentProvider {
  const provider = PROVIDERS[id];
  if (!provider) throw new Error(`${id} does not implement the hosted-checkout PaymentProvider interface.`);
  return provider;
}

export function isProviderId(value: string): value is ProviderId {
  return value === 'flutterwave' || value === 'paystack';
}

export type { PaymentProvider, ProviderId } from './provider';
