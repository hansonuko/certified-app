'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { adjustCertificateCreditsManual } from '@/lib/payments/credits';

export type AdjustWalletState = { error: string } | { success: true } | null;

/**
 * Manual wallet correction (goodwill refund, fixing a support-desk error) —
 * Admin/Finance only (manage_billing, same gate as the pricing controls on
 * /staff/finance/billing). Every adjustment writes an AuditLog row
 * (docs/roles-permissions.md §3: "every state-changing action by any
 * staff role"), same as the pricing-tier/currency-rate edits.
 */
export async function adjustWallet(_prev: AdjustWalletState, formData: FormData): Promise<AdjustWalletState> {
  const { userId, role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) return { error: 'You do not have permission to adjust wallets.' };

  const orgId = formData.get('org_id') as string;
  const quantity = Number(formData.get('quantity'));
  const note = (formData.get('note') as string | null)?.trim() ?? '';

  if (!orgId) return { error: 'Missing organization.' };
  if (!Number.isInteger(quantity) || quantity === 0) {
    return { error: 'Enter a non-zero whole number — positive to credit, negative to debit.' };
  }
  if (note.length < 5) return { error: 'A reason note (5+ characters) is required for every manual adjustment.' };

  const admin = createAdminClient();
  const result = await adjustCertificateCreditsManual(admin, { orgId, quantity, note, staffId: userId });
  if ('error' in result) return { error: result.error };

  await admin.from('audit_log').insert({
    actor_id: userId,
    actor_type: 'staff',
    action: 'wallet_manually_adjusted',
    target_type: 'organizations',
    target_id: orgId,
    before: null,
    after: { quantity, note, balance_after: result.balance },
  });

  revalidatePath(`/staff/finance/wallets/${orgId}`);
  revalidatePath('/staff/finance/wallets');
  revalidatePath('/dashboard/billing');
  return { success: true };
}
