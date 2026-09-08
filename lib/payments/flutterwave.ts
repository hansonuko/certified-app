import type { CreateCheckoutParams, CreateCheckoutResult, PaymentProvider, VerifyTransactionResult, WebhookEvent } from './provider';

// Flutterwave v3 REST API — https://developer.flutterwave.com/docs.
// FLUTTERWAVE_SECRET_KEY is a server-only Bearer credential (never sent to
// the client, never logged — CLAUDE.md rule #3's "signing key never
// touches the client" applies equally to payment secrets, see the new
// rule this migration's PR adds). FLUTTERWAVE_WEBHOOK_HASH is a separate
// static secret you set once in the Flutterwave dashboard's webhook config
// and compare against the `verif-hash` header on every incoming webhook —
// Flutterwave's webhook "signature" is this plain shared-secret comparison,
// not an HMAC of the body.
const API_BASE = 'https://api.flutterwave.com/v3';

function secretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY is not configured.');
  return key;
}

export const flutterwaveProvider: PaymentProvider = {
  name: 'flutterwave',

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    try {
      const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: params.reference,
          amount: params.amount,
          currency: params.currency,
          redirect_url: params.redirectUrl,
          customer: { email: params.customerEmail },
          customizations: { title: 'Certified Africa', description: params.description },
        }),
      });
      const json = await res.json();
      if (json.status === 'success' && json.data?.link) {
        return { checkoutUrl: json.data.link as string };
      }
      return { error: json.message || 'Flutterwave checkout could not be created.' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Flutterwave request failed.' };
    }
  },

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    try {
      const res = await fetch(`${API_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey()}` },
      });
      const json = await res.json();
      if (json.status !== 'success' || !json.data) return { status: 'pending' };
      const { status, amount, currency } = json.data;
      if (status === 'successful') return { status: 'success', amount, currency };
      if (status === 'failed') return { status: 'failed' };
      return { status: 'pending' };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Flutterwave verification request failed.' };
    }
  },

  verifyWebhookSignature(req: Request): boolean {
    const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    if (!expected) return false; // never trust an unconfigured webhook secret
    const received = req.headers.get('verif-hash');
    return !!received && received === expected;
  },

  parseWebhookEvent(rawBody: string): WebhookEvent | null {
    try {
      const json = JSON.parse(rawBody);
      const data = json.data;
      if (!data?.tx_ref) return null;
      return {
        reference: data.tx_ref,
        status: data.status === 'successful' ? 'success' : 'failed',
        amount: data.amount,
        currency: data.currency,
      };
    } catch {
      return null;
    }
  },
};
