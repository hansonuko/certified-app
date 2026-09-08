import type { PaymentProvider, ProviderId } from './provider';
import { flutterwaveProvider } from './flutterwave';
import { paystackProvider } from './paystack';

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  flutterwave: flutterwaveProvider,
  paystack: paystackProvider,
};

export function getProvider(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

export function isProviderId(value: string): value is ProviderId {
  return value === 'flutterwave' || value === 'paystack';
}

export type { PaymentProvider, ProviderId } from './provider';
