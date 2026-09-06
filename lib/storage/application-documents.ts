import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Uploads to the private `application-documents` Storage bucket
 * (supabase/migrations/0010), used for the identification document and
 * proof-of-operation upload on the application form (docs/blueprint.md
 * §3.1). Image uploads are re-encoded server-side — stripped of EXIF and
 * re-saved as a clean JPEG (CLAUDE.md rule #8) — never stored or served as
 * the raw uploaded bytes. PDF uploads (e.g. a CAC certificate) are stored
 * as-is: EXIF isn't a PDF concern, and the private bucket already keeps the
 * raw bytes from ever being served publicly.
 *
 * The returned value is a Storage *path* within the private bucket, not a
 * public URL — despite the `_url` suffix on the columns that store it
 * (owner_id_document_url, proof_of_operation_url), consistent with how
 * those columns were already named before this helper existed. Reading the
 * file back means requesting a signed URL
 * (supabase.storage.from('application-documents').createSignedUrl(path, expiresIn)),
 * gated by the same RLS policies as any other read.
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadApplicationDocument({
  supabase,
  userId,
  file,
  label,
}: {
  supabase: SupabaseClient;
  userId: string;
  file: File;
  label: string;
}): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type for ${label}: ${file.type || 'unknown'}. Upload a JPEG, PNG, WebP, or PDF.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${label} is too large (max 10MB).`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let toUpload: Buffer = bytes;
  let ext = 'pdf';
  let contentType = 'application/pdf';

  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    // .rotate() with no args auto-orients using the EXIF orientation tag
    // *before* it gets stripped, so the re-encoded image still looks right
    // side up even though its metadata is gone. sharp's .jpeg() output
    // carries no EXIF unless .withMetadata() is called, which it isn't.
    toUpload = await sharp(bytes).rotate().jpeg({ quality: 88 }).toBuffer();
    ext = 'jpg';
    contentType = 'image/jpeg';
  }

  const path = `${userId}/${label}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('application-documents').upload(path, toUpload, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload ${label}: ${error.message}`);
  }

  return path;
}
