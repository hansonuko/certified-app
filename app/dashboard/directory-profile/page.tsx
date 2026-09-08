import Link from 'next/link';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { DirectoryProfileForm } from './DirectoryProfileForm';

// /dashboard/directory-profile (docs/sitemap.md §5: "Public profile
// preview — how the org appears in /directory/org/[slug], edit org bio").
// Was a ComingSoon placeholder despite Phase 5's public directory already
// existing and fully rendering these fields — bio/training_fields have
// been owner-editable at the RLS level since Phase 0, this page was just
// never built to expose that.
export default async function DirectoryProfilePage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('display_name, slug, bio, training_fields, status')
    .eq('id', orgId)
    .maybeSingle();

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-certified-navy">Directory profile</h1>
        <p className="text-certified-muted">
          Your bio and training fields as shown on your public directory page.{' '}
          {org?.slug ? (
            <Link href={`/directory/org/${org.slug}`} target="_blank" className="text-certified-navy underline">
              View your public page →
            </Link>
          ) : null}
        </p>
      </div>

      <DirectoryProfileForm bio={org?.bio ?? null} trainingFields={org?.training_fields ?? null} />
    </main>
  );
}
