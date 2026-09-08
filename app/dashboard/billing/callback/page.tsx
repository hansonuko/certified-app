import Link from 'next/link';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createAdminClient } from '@/lib/supabase/admin';
import { confirmPaymentByReference } from '@/lib/payments/confirm';
import { isProviderId } from '@/lib/payments';

// /dashboard/billing/callback — where Flutterwave/Paystack redirect the
// issuer back to after checkout (docs/build-phases.md Phase 11 item 1).
// Confirms the payment itself right here as a fallback in case the
// provider's webhook is slow or never arrives — same "page view drives the
// same privileged path a background trigger would" resilience pattern as
// the bulk-issuance job status page's opportunistic advanceJob() call
// (lib/bulk-issuance/processor.ts). Idempotent either way
// (lib/payments/confirm.ts): whichever of the webhook or this page runs
// first does the crediting, the other is a no-op.
export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; provider?: string }>;
}) {
  const { orgId } = await requireApprovedIssuerSession();
  const { reference, provider } = await searchParams;

  let outcome: 'success' | 'failed' | 'pending' | 'not_found' | 'error' | 'invalid' = 'invalid';
  let message: string | undefined;

  if (reference && provider && isProviderId(provider)) {
    const admin = createAdminClient();
    // Scope the lookup to this org before confirming anything — the
    // reference itself is a random, non-enumerable token, but this makes
    // sure a stray or foreign reference in the URL can never surface
    // *another* org's payment result on this page.
    const { data: payment } = await admin
      .from('payments')
      .select('org_id')
      .eq('provider_reference', reference)
      .eq('provider', provider)
      .maybeSingle();

    if (payment?.org_id === orgId) {
      const result = await confirmPaymentByReference(admin, provider, reference);
      outcome = result.status;
      message = 'message' in result ? result.message : undefined;
    } else {
      outcome = 'not_found';
    }
  }

  const COPY: Record<typeof outcome, { heading: string; body: string }> = {
    success: { heading: 'Payment confirmed', body: 'Your certificate credits have been added to your balance.' },
    pending: {
      heading: 'Still processing',
      body: 'Your payment is being confirmed — this can take a minute. Check back shortly, or refresh this page.',
    },
    failed: { heading: 'Payment failed', body: 'This payment did not go through. No credits were added — you can try again.' },
    not_found: { heading: "We couldn't find that payment", body: 'The payment reference in this link is not recognized.' },
    error: {
      heading: 'Something went wrong confirming this payment',
      body: message || 'Please check back shortly, or contact support if this persists.',
    },
    invalid: { heading: 'Invalid payment link', body: 'This page needs a valid payment reference and provider in the URL.' },
  };
  const { heading, body } = COPY[outcome];

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">{heading}</h1>
      <p className="text-certified-muted">{body}</p>
      <Link href="/dashboard/billing" className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white">
        Back to Billing
      </Link>
    </main>
  );
}
