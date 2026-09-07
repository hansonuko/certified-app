'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadTraineePhoto } from '@/lib/storage/trainee-photos';

export type ProfileFormState = { error: string } | { success: true } | null;

const CONTACT_VISIBILITY_VALUES = ['public', 'gated', 'hidden'];

/**
 * bio / photo_url / contact_visibility / open_to_hire (docs/build-phases.md
 * Phase 8). None of these are guarded by guard_trainee_moderation_columns
 * (0006/0023) — trainees_self_all's own RLS (claimed_by_user_id = auth.uid())
 * is the entire enforcement here, so this runs on the caller's own session
 * client, not service-role. The `.eq('claimed_by_user_id', user.id)` below
 * documents that scoping rather than adding a second enforcement layer.
 */
export async function updateProfile(id: string, _prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/profile/${id}`);

  const bio = (formData.get('bio') as string | null)?.trim() || null;
  const contactVisibility = formData.get('contact_visibility') as string | null;
  const openToHire = formData.get('open_to_hire') === 'on';
  const photoFile = formData.get('photo');

  if (contactVisibility && !CONTACT_VISIBILITY_VALUES.includes(contactVisibility)) {
    return { error: 'Invalid contact visibility value.' };
  }

  let photoUrl: string | undefined;
  try {
    if (photoFile instanceof File && photoFile.size > 0) {
      photoUrl = await uploadTraineePhoto({ supabase, userId: user.id, file: photoFile });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Photo upload failed.' };
  }

  const { error } = await supabase
    .from('trainees')
    .update({
      bio,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      ...(contactVisibility ? { contact_visibility: contactVisibility } : {}),
      open_to_hire: openToHire,
    })
    .eq('id', id)
    .eq('claimed_by_user_id', user.id);

  if (error) return { error: `Could not update your profile: ${error.message}` };

  return { success: true };
}

export type HideState = { error: string } | null;

/**
 * Self-hide/unhide (docs/session-handoff.md §16 item 3, recommended
 * approach). is_hidden IS guarded by guard_trainee_moderation_columns —
 * including against the row's own claimed_by_user_id via trainees_self_all —
 * so this has to go through the service-role client (migration 0023's
 * `auth.uid() is null` escape valve is what lets it past the trigger at
 * all). Ownership is enforced here in application code instead, baked into
 * the update's own WHERE (`claimed_by_user_id = user.id`) so the check and
 * the write are atomic — same pattern as app/claim/[token]/actions.ts.
 *
 * Deliberately not written to audit_log (§16 item 4): CLAUDE.md rule #7 is
 * about *admin* decisions specifically, and a trainee hiding their own
 * profile is a low-stakes self-service action, not one of those.
 */
export async function setHidden(id: string, hidden: boolean, _prev: HideState): Promise<HideState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/profile/${id}`);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('trainees')
    .update({ is_hidden: hidden })
    .eq('id', id)
    .eq('claimed_by_user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) return { error: 'Could not update your profile visibility. Please try again.' };
  if (!data) return { error: 'Profile not found, or not claimed by your account.' };

  return null;
}
