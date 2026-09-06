'use server';

import { revalidatePath } from 'next/cache';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { uploadBrandAsset } from '@/lib/storage/brand-assets';
import { CERTIFICATE_TEMPLATES } from '@/lib/certificates/templates';

export type BrandFormState = { error: string } | { success: true } | null;

export async function saveBrand(_prev: BrandFormState, formData: FormData): Promise<BrandFormState> {
  const { userId, orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const primaryColor = (formData.get('primary_color') as string | null) ?? '#0F2340';
  const signatoryName = (formData.get('signatory_name') as string | null)?.trim();
  const signatoryTitle = (formData.get('signatory_title') as string | null)?.trim();
  const signatureMethod = formData.get('signature_method');
  const templateId = formData.get('template_id') as string | null;
  const logoFile = formData.get('logo');
  const signatureFile = formData.get('signature_image');

  if (!signatoryName || !signatoryTitle) {
    return { error: 'Signatory name and title are both required.' };
  }
  if (!templateId || !(templateId in CERTIFICATE_TEMPLATES)) {
    return { error: 'Choose one of the 10 launch templates.' };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    return { error: 'Primary color must be a valid hex color.' };
  }

  const updates: Record<string, unknown> = {
    brand_primary_color: primaryColor,
    brand_signatory_name: signatoryName,
    brand_signatory_title: signatoryTitle,
    brand_template_id: templateId,
  };

  try {
    if (logoFile instanceof File && logoFile.size > 0) {
      updates.brand_logo_url = await uploadBrandAsset({ supabase, userId, file: logoFile, label: 'logo' });
    }

    if (signatureMethod === 'upload' && signatureFile instanceof File && signatureFile.size > 0) {
      updates.brand_signature_image_url = await uploadBrandAsset({
        supabase,
        userId,
        file: signatureFile,
        label: 'signature',
      });
    } else if (signatureMethod === 'typed') {
      // Switching back to the typed (italic serif) signature clears any
      // previously uploaded image — lib/certificates/Signature.tsx falls
      // back to typed whenever signatureImageUrl is empty.
      updates.brand_signature_image_url = null;
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'File upload failed.' };
  }

  const { error } = await supabase.from('organizations').update(updates).eq('id', orgId);
  if (error) {
    return { error: `Could not save brand settings: ${error.message}` };
  }

  revalidatePath('/dashboard/brand');
  return { success: true };
}
