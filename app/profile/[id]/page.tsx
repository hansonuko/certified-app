import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';
import { HideToggleForm } from './HideToggleForm';

/**
 * /profile/[id] (docs/build-phases.md Phase 8) — the claimed-trainee profile
 * editor. Runs on the caller's own session client throughout (unlike
 * ./actions.ts's setHidden(), which needs service-role for the guarded
 * is_hidden column) — trainees_self_all's RLS (claimed_by_user_id =
 * auth.uid(), 0006_trainees.sql) is what actually scopes this read to rows
 * the signed-in user has claimed; the `.eq('claimed_by_user_id', user.id)`
 * below documents that rather than adding a second enforcement layer.
 */
export default async function ProfileEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/profile/${id}`);

  const { data: trainee } = await supabase
    .from('trainees')
    .select('id, full_name, bio, photo_url, contact_visibility, open_to_hire, is_hidden')
    .eq('id', id)
    .eq('claimed_by_user_id', user.id)
    .maybeSingle();

  if (!trainee) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 p-8">
      <h1 className="font-display text-2xl text-certified-navy">{trainee.full_name}&rsquo;s profile</h1>
      <ProfileForm id={id} trainee={trainee} />
      <HideToggleForm id={id} isHidden={trainee.is_hidden} />
    </main>
  );
}
