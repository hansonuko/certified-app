import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { paystackProvider } from '@/lib/payments/paystack';
import { confirmPaymentFromWebhookEvent } from '@/lib/payments/confirm';

// Paystack webhook target (Monetization Flow A, docs/build-phases.md Phase
// 11 item 1). Configure this URL in the Paystack dashboard's webhook
// settings — Paystack has no separate webhook secret, it signs the raw
// request body with your own PAYSTACK_SECRET_KEY (HMAC-SHA512), compared
// here against the `x-paystack-signature` header.
//
// Every write this route can cause goes through confirmPaymentFromWebhookEvent
// (lib/payments/confirm.ts) — idempotent, amount/currency-checked against
// the payment row created at checkout time, never trusting this payload
// alone.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!paystackProvider.verifyWebhookSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = paystackProvider.parseWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: 'Unrecognized payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  await confirmPaymentFromWebhookEvent(admin, 'paystack', event);

  return NextResponse.json({ received: true });
}
