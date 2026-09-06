import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Uploads a rendered certificate PDF to the public `certificates` Storage
 * bucket (supabase/migrations/0012). Unlike every other upload helper in
 * lib/storage/, the input here is a server-generated buffer (react-pdf's
 * `renderToBuffer` output), not a user-supplied file — there's nothing to
 * re-encode or validate a MIME type against, the bytes are entirely ours.
 * Uses the service-role client (lib/supabase/admin.ts) since issuance
 * already runs there (certificates has no write RLS for anyone, see
 * supabase/migrations/0007's file-header comment) — pass that same client
 * in here rather than constructing a second one.
 */
export async function uploadCertificatePdf({
  supabase,
  ownerUserId,
  publicId,
  pdf,
}: {
  supabase: SupabaseClient;
  ownerUserId: string;
  publicId: string;
  pdf: Buffer;
}): Promise<string> {
  const path = `${ownerUserId}/${publicId}.pdf`;
  const { error } = await supabase.storage.from('certificates').upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload certificate PDF: ${error.message}`);
  }

  return supabase.storage.from('certificates').getPublicUrl(path).data.publicUrl;
}
