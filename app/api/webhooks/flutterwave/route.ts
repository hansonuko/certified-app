import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { flutterwaveWebhook } from '@/lib/payments/flutterwave';
import { confirmPaymentFromWebhookEvent } from '@/lib/payments/confirm';

// Flutterwave webhook target (Monetization Flow A follow-up, v4 — see
// lib/payments/flutterwave.ts's file header for the v3-vs-v4 rework).
// Configure this URL + FLUTTERWAVE_WEBHOOK_SECRET_HASH (the dashboard's
// webhook secret hash) in the Flutterwave dashboard's webhook settings.
//
// v4 signs the raw body with HMAC-SHA256 using that secret hash, sent as
// the `flutterwave-signature` header (base64) — different from v3's plain
// shared-secret comparison, per developer.flutterwave.com/docs/webhooks.
//
// Every write this route can cause goes through confirmPaymentFromWebhookEvent
// (lib/payments/confirm.ts) — idempotent, amount/currency-checked against
// the payment row created at checkout time, never trusting this payload
// alone. NOTE: the exact v4 webhook payload shape (parseWebhookEvent below)
// is inferred from the documented charge-object schema, not confirmed
// against a real delivered webhook — worth a real check once this is
// configured on a live/sandbox Flutterwave account.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!flutterwaveWebhook.verifyWebhookSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = flutterwaveWebhook.parseWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: 'Unrecognized payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  await confirmPaymentFromWebhookEvent(admin, 'flutterwave', event);

  return NextResponse.json({ received: true });
}
