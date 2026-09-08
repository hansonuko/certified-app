import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { flutterwaveProvider } from '@/lib/payments/flutterwave';
import { confirmPaymentFromWebhookEvent } from '@/lib/payments/confirm';

// Flutterwave webhook target (Monetization Flow A, docs/build-phases.md
// Phase 11 item 1). Configure this URL + FLUTTERWAVE_WEBHOOK_HASH in the
// Flutterwave dashboard's webhook settings.
//
// The raw body is read once, before any JSON parsing, and passed to both
// the signature check and the parser — Flutterwave's webhook "signature" is
// a plain shared-secret header comparison (verifyWebhookSignature), not an
// HMAC of the body, but reading raw-then-parse is still the correct shape
// generally (it's what Paystack's real HMAC check needs) and keeps both
// adapters symmetric.
//
// Every write this route can cause goes through confirmPaymentFromWebhookEvent
// (lib/payments/confirm.ts) — idempotent, amount/currency-checked against
// the payment row created at checkout time, never trusting this payload
// alone.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!flutterwaveProvider.verifyWebhookSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = flutterwaveProvider.parseWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: 'Unrecognized payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  await confirmPaymentFromWebhookEvent(admin, 'flutterwave', event);

  return NextResponse.json({ received: true });
}
