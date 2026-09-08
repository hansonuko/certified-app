import { redirect } from 'next/navigation';
import { requireIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { getApplicationDraft } from '@/lib/apply/draft';
import { ApplyForm } from './ApplyForm';

// docs/sitemap.md: /apply — multi-step application wizard.
export default async function ApplyPage() {
  const { userId } = await requireIssuerSession(); // redirects unauthenticated -> /login, staff -> /staff
  const supabase = await createClient();

  // Already applied — send them to their status page instead of letting
  // them submit a second Organization. (Resubmission after a rejection is
  // a deliberate product decision, docs/blueprint.md §3.1, but that's a
  // distinct "apply again" flow for a later phase, not this guard.)
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (existingOrg) redirect('/apply/status');

  // Save-and-continue-later: resume silently from wherever they left off
  // rather than a separate "you have a draft, resume?" prompt (a
  // deliberate choice — the applicant already has to be signed back in to
  // reach this page at all, that's the confirmation).
  const draft = await getApplicationDraft(supabase, userId);

  return <ApplyForm initialDraft={draft} />;
}
