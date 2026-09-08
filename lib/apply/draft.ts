import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared type for /apply's save-and-continue-later draft
 * (supabase/migrations/0035_application_drafts.sql). form_data is a plain
 * field-name -> string map, not validated here — the same server-side
 * checks in app/(auth)/apply/actions.ts's submitApplication run regardless
 * of whether a field came from a fresh submit or a resumed draft.
 */
export type ApplicationDraft = {
  form_data: Record<string, string>;
  step_index: number;
  identification_document_path: string | null;
  proof_of_operation_path: string | null;
};

export async function getApplicationDraft(supabase: SupabaseClient, userId: string): Promise<ApplicationDraft | null> {
  const { data } = await supabase
    .from('application_drafts')
    .select('form_data, step_index, identification_document_path, proof_of_operation_path')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as ApplicationDraft | null) ?? null;
}
