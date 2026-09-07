import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * /profile (docs/build-phases.md Phase 8) — lists every trainee row this
 * account has claimed. Usually exactly one, but nothing in the schema stops
 * the same auth user from claiming more than one (e.g. certificates from two
 * different organizations), so this is a list rather than a redirect
 * straight to a single /profile/[id].
 */
export default async function ProfileListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/profile');

  const { data: trainees } = await supabase
    .from('trainees')
    .select('id, full_name')
    .eq('claimed_by_user_id', user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Your claimed profiles</h1>
      {trainees && trainees.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {trainees.map((t) => (
            <li key={t.id}>
              <Link href={`/profile/${t.id}`} className="text-certified-navy underline">
                {t.full_name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-certified-muted">
          You haven&rsquo;t claimed any profiles yet. Look for a claim-link email from a certificate you&rsquo;ve
          earned.
        </p>
      )}
    </main>
  );
}
