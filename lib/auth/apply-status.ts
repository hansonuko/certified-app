import { createClient } from '@/lib/supabase/server';

/**
 * Resolves what the shared "become an issuer" callout (components/
 * ApplyStatusCallout.tsx) should show for the current visitor. Mirrors
 * lib/auth/account-link.ts's session-resolution pattern, but this one
 * needs the organization's actual status, not just "does one exist."
 *
 * - anonymous / no-org: visitor has never applied (or isn't signed in at
 *   all) — the generic "apply" pitch.
 * - pending / more_info_requested: already applied, still in review —
 *   never tell this person to "apply" again.
 * - rejected: already applied, wasn't approved — link to /apply/status
 *   rather than repeating the same "apply now" pitch as if nothing
 *   happened (that page already explains reapplying is possible).
 * - approved: already a member — the callout hides entirely for this case
 *   (components/ApplyStatusCallout.tsx), there is nothing to prompt.
 */
export type ApplyStatus =
  | { state: 'anonymous' | 'no-org' }
  | { state: 'pending' | 'more_info_requested' | 'rejected' | 'approved'; displayName: string };

export async function getApplyStatus(): Promise<ApplyStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: 'anonymous' };

  const { data: org } = await supabase
    .from('organizations')
    .select('display_name, status')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (!org) return { state: 'no-org' };

  const state =
    org.status === 'approved' || org.status === 'rejected' || org.status === 'pending' || org.status === 'more_info_requested'
      ? org.status
      : 'pending'; // any future/unrecognized status defaults to the safest "already applied, don't re-pitch" copy
  return { state, displayName: org.display_name };
}
