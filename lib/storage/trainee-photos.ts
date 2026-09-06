import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Uploads to the public `trainee-photos` Storage bucket (supabase/
 * migrations/0012), used for the optional trainee photo captured at
 * add-trainee/issuance time (docs/blueprint.md §3.3). Public for the same
 * reason org-brand-assets (0011) is — the directory (Phase 5) needs to
 * display these. Re-encoded server-side via sharp (rotate to bake in EXIF
 * orientation, then strip it, re-save as JPEG) before storing — CLAUDE.md
 * rule #8, same pattern as lib/storage/application-documents.ts.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadTraineePhoto({
  supabase,
  userId,
  file,
}: {
  supabase: SupabaseClient;
  userId: string;
  file: File;
}): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported photo type: ${file.type || 'unknown'}. Upload a JPEG, PNG, or WebP.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Photo is too large (max 5MB).');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const reencoded = await sharp(bytes).rotate().jpeg({ quality: 88 }).toBuffer();

  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('trainee-photos').upload(path, reencoded, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  return supabase.storage.from('trainee-photos').getPublicUrl(path).data.publicUrl;
}
