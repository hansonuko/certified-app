'use server';

import { createClient } from '@/lib/supabase/server';
import { uploadApplicationDocument } from '@/lib/storage/application-documents';

/**
 * Save-and-continue-later for the /apply wizard (docs/build-phases.md
 * Phase 1 follow-up). Two separate actions, called from ApplyForm.tsx:
 *
 * 1. saveApplicationDraftAction — fired on every step transition (Next/
 *    Back), snapshotting the wizard's plain text/radio/checkbox fields.
 *    Best-effort: a signed-out caller or a transient DB error is a silent
 *    no-op rather than something that should ever block step navigation —
 *    autosave failing quietly is the correct failure mode for a
 *    convenience feature, unlike the real submit in actions.ts.
 * 2. uploadDraftDocumentAction — fired immediately when a file input
 *    changes, so a document survives a resumed session even though
 *    browsers never let JS restore a file input's value. Reuses the exact
 *    same re-encode-on-upload helper actions.ts uses for a live
 *    submission (CLAUDE.md rule #8) — a draft's documents are stored
 *    identically to a submitted application's, just not linked to an
 *    Organization yet.
 *
 * Both upsert supabase/migrations/0035's application_drafts row, owner-
 * scoped by RLS — there is no server-side "does this belong to the caller"
 * check needed beyond that, same as every other owner-scoped table in
 * this codebase.
 */

const DRAFT_FIELD_NAMES = [
  'applicant_type',
  'legal_name',
  'display_name',
  'rc_number',
  'address_street',
  'address_country',
  'address_region',
  'address_locality',
  'owner_full_name',
  'owner_phone',
  'owner_email',
  'training_fields',
  'training_description',
  'trainee_volume_band',
  'declaration_agree',
] as const;

export async function saveApplicationDraftAction(formData: FormData, stepIndex: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const values: Record<string, string> = {};
  for (const name of DRAFT_FIELD_NAMES) {
    const value = formData.get(name);
    if (typeof value === 'string') values[name] = value;
  }

  await supabase.from('application_drafts').upsert({
    user_id: user.id,
    form_data: values,
    step_index: stepIndex,
    updated_at: new Date().toISOString(),
  });
}

export type DraftUploadResult = { path: string } | { error: string };

export async function uploadDraftDocumentAction(
  label: 'identification' | 'proof-of-operation',
  formData: FormData,
): Promise<DraftUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file provided.' };

  let path: string;
  try {
    path = await uploadApplicationDocument({ supabase, userId: user.id, file, label });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed.' };
  }

  const column = label === 'identification' ? 'identification_document_path' : 'proof_of_operation_path';
  await supabase.from('application_drafts').upsert({
    user_id: user.id,
    [column]: path,
    updated_at: new Date().toISOString(),
  });

  return { path };
}
