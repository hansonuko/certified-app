import { createHmac, timingSafeEqual } from 'crypto';
import type { CreateCheckoutParams, CreateCheckoutResult, PaymentProvider, VerifyTransactionResult, WebhookEvent } from './provider';

// Paystack REST API — https://paystack.com/docs/api. PAYSTACK_SECRET_KEY is
// a server-only Bearer credential, also doubling as the webhook HMAC key
// (Paystack has no separate webhook secret — you sign the raw request body
// with your own secret key and compare to the `x-paystack-signature`
// header). Paystack amounts are in the currency's smallest unit (kobo for
// NGN, cents for USD, etc.) — every amount crossing this boundary is
// multiplied/divided by 100 right here, so nowhere else in the codebase
// needs to know that quirk.
const API_BASE = 'https://api.paystack.co';

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  return key;
}

export const paystackProvider: PaymentProvider = {
  name: 'paystack',

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    try {
      const res = await fetch(`${API_BASE}/transaction/initialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: params.reference,
          email: params.customerEmail,
          amount: Math.round(params.amount * 100), // major → minor unit
          currency: params.currency,
          callback_url: params.redirectUrl,
        }),
      });
      const json = await res.json();
      if (json.status && json.data?.authorization_url) {
        return { checkoutUrl: json.data.authorization_url as string };
      }
      return { error: json.message || 'Paystack checkout could not be created.' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Paystack request failed.' };
    }
  },

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    try {
      const res = await fetch(`${API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey()}` },
      });
      const json = await res.json();
      if (!json.status || !json.data) return { status: 'pending' };
      const { status, amount, currency } = json.data;
      if (status === 'success') return { status: 'success', amount: amount / 100, currency };
      if (status === 'failed' || status === 'abandoned') return { status: 'failed' };
      return { status: 'pending' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Paystack verification request failed.' };
    }
  },

  verifyWebhookSignature(req: Request, rawBody: string): boolean {
    const received = req.headers.get('x-paystack-signature');
    if (!received) return false;
    const expected = createHmac('sha512', secretKey()).update(rawBody).digest('hex');
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  },

  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const json = JSON.parse(rawBody);
      const data = json.data;
      if (!data?.reference) return null;
      return {
        reference: data.reference,
        status: data.status === 'success' ? 'success' : 'failed',
        amount: data.amount / 100,
        currency: data.currency,
      };
    } catch {
      return null;
    }
  },
};
