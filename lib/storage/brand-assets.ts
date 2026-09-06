import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Uploads to the public `org-brand-assets` Storage bucket (supabase/
 * migrations/0011) — logo and signature image, docs/build-phases.md
 * Phase 3. Unlike lib/storage/application-documents.ts, this bucket is
 * public by design (certificates and, later, the public directory need to
 * display these images), so this returns a public URL rather than a
 * Storage path.
 *
 * Every upload is re-encoded server-side via sharp — stripped of EXIF and
 * re-saved as a clean PNG, which preserves transparency (important for a
 * signature image or a logo that isn't a solid rectangle) — CLAUDE.md rule
 * #8, same reasoning as lib/storage/application-documents.ts.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadBrandAsset({
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
    throw new Error(`Unsupported file type for ${label}: ${file.type || 'unknown'}. Upload a JPEG, PNG, or WebP.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${label} is too large (max 5MB).`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const reencoded = await sharp(bytes).rotate().png().toBuffer();

  const path = `${userId}/${label}-${Date.now()}.png`;
  const { error } = await supabase.storage.from('org-brand-assets').upload(path, reencoded, {
    contentType: 'image/png',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload ${label}: ${error.message}`);
  }

  return supabase.storage.from('org-brand-assets').getPublicUrl(path).data.publicUrl;
}
