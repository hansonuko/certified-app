import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { BrandForm } from './BrandForm';

// /dashboard/brand — docs/build-phases.md Phase 3: logo, primary color,
// signatory name/title, signature (typed or uploaded), template choice
// among the 10 launch templates, with a live preview.
export default async function BrandPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('display_name, brand_logo_url, brand_primary_color, brand_signatory_name, brand_signatory_title, brand_signature_image_url, brand_template_id')
    .eq('id', orgId)
    .single();

  return (
    <BrandForm
      initial={{
        issuerName: org?.display_name ?? '',
        logoUrl: org?.brand_logo_url ?? null,
        primaryColor: org?.brand_primary_color ?? null,
        signatoryName: org?.brand_signatory_name ?? null,
        signatoryTitle: org?.brand_signatory_title ?? null,
        signatureImageUrl: org?.brand_signature_image_url ?? null,
        templateId: org?.brand_template_id ?? null,
      }}
    />
  );
}
