import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoldSeal } from '@/components/GoldSeal';

// Trainee public profile — docs/build-phases.md Phase 5, docs/blueprint.md
// §3.5. Public, unauthenticated, SSR. Reads directory_listings_view
// (supabase/migrations/0018) filtered to one trainee_id rather than a new
// query/view — that view already excludes hidden trainees and scopes to
// active certificates from approved orgs only, so a direct link to a
// moderated-away or never-existed profile 404s the same way it would if it
// never showed up in /directory search results in the first place.
//
// No raw phone/email here (CLAUDE.md rule #5) and no working "Contact"
// action yet — the reveal/relay flow is Phase 6. A disabled affordance is
// shown instead of either building a half-finished contact flow or
// silently omitting the concept blueprint §3.5 calls for.
type DirectoryRow = {
  trainee_id: string;
  full_name: string;
  photo_url: string | null;
  bio: string | null;
  open_to_hire: boolean;
  country: string | null;
  region: string | null;
  locality: string | null;
  public_id: string;
  program_title: string;
  completion_date: string;
  category: string | null;
  issuer_display_name: string;
};

export default async function TraineeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('directory_listings_view')
    .select('*')
    .eq('trainee_id', id)
    .order('completion_date', { ascending: false })
    .returns<DirectoryRow[]>();

  if (!rows || rows.length === 0) notFound();

  const profile = rows[0];
  const location = [profile.locality, profile.region, profile.country].filter(Boolean).join(', ');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 sm:p-8">
      <Link href="/directory" className="text-sm text-certified-muted underline">
        ← Back to directory
      </Link>

      <div className="flex flex-col items-center gap-4 text-center">
        {profile.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- trainee photos are arbitrary external Storage URLs
          <img src={profile.photo_url} alt={profile.full_name} className="h-28 w-28 rounded-full object-cover" />
        ) : (
          <div className="h-28 w-28 rounded-full bg-certified-surface-2" />
        )}

        <div>
          <h1 className="font-display text-3xl text-certified-navy">{profile.full_name}</h1>
          {location ? <p className="text-certified-muted">{location}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <GoldSeal size={40} idPrefix={`profile-${profile.trainee_id}`} />
          <span className="text-sm font-semibold text-certified-ink">Verified Certified</span>
        </div>

        {profile.open_to_hire ? (
          <span className="w-fit rounded-full bg-certified-success/10 px-3 py-1 text-xs font-semibold text-certified-success">
            Open to hire
          </span>
        ) : null}
      </div>

      {profile.bio ? <p className="text-center text-certified-ink">{profile.bio}</p> : null}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">
          Certificate{rows.length > 1 ? 's' : ''} earned
        </h2>
        {rows.map((cert) => (
          <div key={cert.public_id} className="flex flex-col gap-1 rounded-card border border-certified-border bg-certified-surface p-4">
            <p className="font-display text-base text-certified-ink">{cert.program_title}</p>
            <p className="flex items-center gap-1.5 text-sm text-certified-muted">
              Issued by <span className="font-medium text-certified-ink">{cert.issuer_display_name}</span>
              <span
                title="Approved Issuer"
                className="rounded-full bg-certified-gold/15 px-2 py-0.5 text-xs font-semibold text-certified-gold"
              >
                Approved Issuer
              </span>
            </p>
            <p className="text-xs text-certified-muted">Completed {cert.completion_date}</p>
            <Link href={`/verify/${cert.public_id}`} className="mt-1 w-fit text-sm text-certified-navy underline">
              View verification →
            </Link>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1 rounded-card border border-certified-border bg-certified-surface-2 p-4 text-center">
        <button
          type="button"
          disabled
          className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white opacity-40"
        >
          Contact {profile.full_name.split(' ')[0]}
        </button>
        <p className="text-xs text-certified-muted">Contact requests are coming in a later phase.</p>
      </div>
    </main>
  );
}
