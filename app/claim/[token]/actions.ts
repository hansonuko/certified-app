'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ClaimState = { error: string } | null;

/**
 * Links the signed-in user's auth.users id to a trainee row (docs/build-
 * phases.md Phase 8). Re-validates the token from scratch here rather than
 * trusting anything the page already rendered — a page load and the confirm
 * click can be minutes apart.
 *
 * Uses the service-role client: before this update, `claimed_by_user_id` is
 * still null, so neither trainees_owner_all nor trainees_self_all (0006_
 * trainees.sql) would let the claiming user's own session pass RLS at all —
 * the token itself is the authorization here, same "app checks ownership,
 * service role does the write" pattern as certificates/audit_log/jobs. The
 * `.eq('claimed', false).gt('claim_token_expires_at', ...)` conditions on the
 * update make the not-already-claimed / not-expired checks atomic with the
 * write instead of a separate read-then-write with a race between them.
 * Migration 0023 is what lets a non-staff, non-owner caller (service role
 * has no auth.uid() at all) reach this write past
 * guard_trainee_moderation_columns in the first place.
 */
export async function claimProfile(token: string, _prev: ClaimState): Promise<ClaimState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/claim/${token}`);

  const admin = createAdminClient();
  const { data: trainee, error } = await admin
    .from('trainees')
    .update({
      claimed: true,
      claimed_by_user_id: user.id,
      claim_token: null,
      claim_token_expires_at: null,
    })
    .eq('claim_token', token)
    .eq('claimed', false)
    .gt('claim_token_expires_at', new Date().toISOString())
    .select('id')
    .maybeSingle();

  if (error) return { error: 'Could not claim this profile. Please try again.' };
  if (!trainee) return { error: 'This claim link is invalid, expired, or has already been used.' };

  // Straight to the profile editor (docs/build-phases.md Phase 8 item 2) —
  // trainees_self_all's RLS already lets this account read/edit it, since
  // claimed_by_user_id was just set above.
  redirect(`/profile/${trainee.id}`);
}
