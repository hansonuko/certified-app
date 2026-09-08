'use server';

import { revalidatePath } from 'next/cache';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

export type DirectoryProfileState = { error: string } | null;

/**
 * Edits the two fields /directory/org/[slug] actually renders beyond what
 * /dashboard/brand already covers (logo/color/template/signatory): bio and
 * training_fields. Both are already owner-editable at the RLS level today
 * (organizations_owner_all, supabase/migrations/0003) — this is purely the
 * missing UI, not a new capability. slug/display_name are read-only here
 * on purpose: display_name changing would desync from certificates'
 * issuer_display_name snapshots in spirit (not literally — those are
 * trainee-side snapshots per CLAUDE.md rule #4 — but it's still the name
 * printed on every certificate this org has issued, not something to
 * change casually from a bio-editing form), and slug is the org's public
 * URL — regenerating it would break any link already shared to it.
 */
export async function updateDirectoryProfile(_prev: DirectoryProfileState, formData: FormData): Promise<DirectoryProfileState> {
  const { orgId } = await requireApprovedIssuerSession();

  const bio = (formData.get('bio') as string | null)?.trim() || null;
  const trainingFields = (formData.get('training_fields') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('organizations').update({ bio, training_fields: trainingFields }).eq('id', orgId);
  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath('/dashboard/directory-profile');
  return null;
}
