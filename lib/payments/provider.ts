/**
 * Provider-agnostic payment interface (Monetization Flow A, docs/build-
 * phases.md Phase 11 item 1) — same shape as every other external-service
 * abstraction in this codebase (lib/rate-limit's RateLimiter, lib/email's
 * sender): one interface, one adapter per real provider
 * (flutterwave.ts/paystack.ts), so a call site never branches on which
 * provider was chosen except to pick which adapter to hand to it.
 *
 * Both Flutterwave and Paystack have free sandbox/test-mode credentials —
 * CLAUDE.md's free-tier discipline extends naturally here: dev/testing runs
 * on test-mode keys against the real sandbox endpoints (there's no
 * meaningful "mock" for a hosted checkout redirect the way there is for
 * Upstash/Resend), never live keys, and a real charge only ever happens
 * with the user's explicit go-ahead.
 */

export type CreateCheckoutParams = {
  reference: string; // provider_reference — must be unique per attempt
  amount: number; // in the currency's major unit (e.g. 1000 = ₦1,000) — adapters convert to minor units where the provider requires it
  currency: string; // ISO 4217
  customerEmail: string;
  redirectUrl: string;
  description: string;
};

export type CreateCheckoutResult = { checkoutUrl: string } | { error: string };

export type VerifyTransactionResult =
  | { status: 'success'; amount: number; currency: string }
  | { status: 'failed' }
  | { status: 'pending' }
  | { error: string };

export type WebhookEvent = { reference: string; status: 'success' | 'failed'; amount: number; currency: string };

export interface PaymentProvider {
  readonly name: 'flutterwave' | 'paystack';
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;
  /** Verifies the raw webhook request before parseWebhookEvent is trusted — every route handler must call this first (CLAUDE.md: webhook payloads are untrusted until their signature checks out). */
  verifyWebhookSignature(req: Request, rawBody: string): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent | null;
}

export type ProviderId = PaymentProvider['name'];
