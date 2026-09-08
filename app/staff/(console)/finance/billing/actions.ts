'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';

export type PricingActionState = { error: string } | { success: true } | null;

/**
 * Admin/Finance-only pricing controls for certificate credits (Monetization
 * Flow A, docs/build-phases.md Phase 11 item 1) — the user-requested
 * capability to adjust discount percentages "at any given time" without a
 * redeploy. `can(role, 'manage_billing')` is the same action docs/roles-
 * permissions.md §2 already scoped to "plan/pricing config (post-
 * monetization)" before there was anything real to configure — this is the
 * first thing that actually exercises it. Every change writes an AuditLog
 * row (docs/roles-permissions.md §3: "every state-changing action by any
 * staff role") via the service-role client, same as every other staff
 * mutation — certificate_credit_pricing_tiers/payment_currency_rates have
 * no client-writable RLS policy for the *update* path in general use, only
 * for is_admin()/is_finance(), and going through the service-role client
 * here keeps the audit-log write and the actual update atomic from the
 * caller's point of view.
 */
export async function updatePricingTier(_prev: PricingActionState, formData: FormData): Promise<PricingActionState> {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) return { error: 'You do not have permission to change pricing.' };

  const tierId = formData.get('tier_id') as string;
  const discountPercent = Number(formData.get('discount_percent'));

  if (!tierId || Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: 'Enter a discount percentage between 0 and 100.' };
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from('certificate_credit_pricing_tiers')
    .select('discount_percent')
    .eq('id', tierId)
    .single();

  const { error } = await admin
    .from('certificate_credit_pricing_tiers')
    .update({ discount_percent: discountPercent, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', tierId);

  if (error) return { error: `Could not update pricing tier: ${error.message}` };

  await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'pricing_tier_updated',
    target_type: 'certificate_credit_pricing_tiers',
    target_id: tierId,
    before: { discount_percent: before?.discount_percent ?? null },
    after: { discount_percent: discountPercent },
  });

  revalidatePath('/staff/finance/billing');
  revalidatePath('/dashboard/billing');
  return { success: true };
}

export async function updateCurrencyRate(_prev: PricingActionState, formData: FormData): Promise<PricingActionState> {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) return { error: 'You do not have permission to change pricing.' };

  const currency = formData.get('currency') as string;
  const ngnRate = Number(formData.get('ngn_rate'));

  if (!currency || Number.isNaN(ngnRate) || ngnRate <= 0) {
    return { error: 'Enter a rate greater than 0.' };
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from('payment_currency_rates')
    .select('id, ngn_rate')
    .eq('currency', currency)
    .single();

  const { error } = await admin
    .from('payment_currency_rates')
    .update({ ngn_rate: ngnRate, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('currency', currency);

  if (error) return { error: `Could not update currency rate: ${error.message}` };

  await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'currency_rate_updated',
    target_type: 'payment_currency_rates',
    target_id: before?.id ?? null,
    before: { currency, ngn_rate: before?.ngn_rate ?? null },
    after: { currency, ngn_rate: ngnRate },
  });

  revalidatePath('/staff/finance/billing');
  revalidatePath('/dashboard/billing');
  return { success: true };
}
