import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Thin wrappers around supabase/migrations/0030's three SECURITY DEFINER
 * functions — the only path anything in this codebase should touch
 * organizations.certificate_credits through. `admin` here always means a
 * service-role client (lib/supabase/admin.ts): the functions themselves
 * bypass RLS by virtue of being SECURITY DEFINER, but callers should still
 * never invoke these from a request that hasn't already established the
 * caller is allowed to (issuance code, or the payment-confirmation path).
 */

export async function spendCertificateCredit(admin: SupabaseClient, orgId: string): Promise<boolean> {
  const { data, error } = await admin.rpc('spend_certificate_credit', { p_org_id: orgId });
  if (error) {
    console.error('spend_certificate_credit failed:', error.message);
    return false;
  }
  return data === true;
}

export async function refundCertificateCredit(admin: SupabaseClient, orgId: string, reason: string): Promise<void> {
  const { error } = await admin.rpc('refund_certificate_credit', { p_org_id: orgId, p_reason: reason });
  if (error) console.error('refund_certificate_credit failed:', error.message);
}

/**
 * Staff-only manual balance correction (goodwill refund, support-desk
 * fix) — the caller (app/staff/(console)/finance/wallets/actions.ts) must
 * have already checked can(role, 'manage_billing') before reaching this;
 * the SECURITY DEFINER function itself trusts its caller, same as every
 * other function here.
 */
export async function adjustCertificateCreditsManual(
  admin: SupabaseClient,
  params: { orgId: string; quantity: number; note: string; staffId: string },
): Promise<{ balance: number } | { error: string }> {
  const { data, error } = await admin.rpc('adjust_certificate_credits_manual', {
    p_org_id: params.orgId,
    p_quantity: params.quantity,
    p_note: params.note,
    p_staff_id: params.staffId,
  });
  if (error) return { error: error.message };
  return { balance: data as number };
}

export async function addCertificateCredits(
  admin: SupabaseClient,
  params: {
    orgId: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    totalAmount: number;
    currency: string;
    paymentId: string;
  },
): Promise<number | null> {
  const { data, error } = await admin.rpc('add_certificate_credits', {
    p_org_id: params.orgId,
    p_quantity: params.quantity,
    p_unit_price: params.unitPrice,
    p_discount_percent: params.discountPercent,
    p_total_amount: params.totalAmount,
    p_currency: params.currency,
    p_payment_id: params.paymentId,
  });
  if (error) {
    console.error('add_certificate_credits failed:', error.message);
    return null;
  }
  return data as number;
}
