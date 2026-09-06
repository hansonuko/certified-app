import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoldSeal } from '@/components/GoldSeal';

// Issuer public page — docs/blueprint.md §3.5 ("Issuer's own public page
// lists their training programs + roster of certified trainees, and can
// also be contacted directly"), docs/sitemap.md's `/directory/org/[slug]`.
// Public, unauthenticated, SSR.
type DirectoryRow = {
  trainee_id: string;
  full_name: string;
  photo_url: string | null;
  open_to_hire: boolean;
  public_id: string;
  program_title: string;
  category: string | null;
};

export default async function IssuerPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations_public_view')
    .select('id, display_name, brand_logo_url, address_country, address_region, address_locality, slug, bio, training_fields')
    .eq('slug', slug)
    .maybeSingle();

  if (!org) notFound();

  const { data: rows } = await supabase
    .from('directory_listings_view')
    .select('trainee_id, full_name, photo_url, open_to_hire, public_id, program_title, category')
    .eq('org_id', org.id)
    .returns<DirectoryRow[]>();

  const location = [org.address_locality, org.address_region, org.address_country].filter(Boolean).join(', ');

  // Programs (grouped by title, with how many roster members hold it) and
  // the trainee roster (deduped — a trainee with multiple certificates
  // under this org only appears once) both come from the same rows, since
  // directory_listings_view is one row per (trainee, active certificate).
  const programs = new Map<string, { category: string | null; count: number }>();
  const trainees = new Map<string, { fullName: string; photoUrl: string | null; openToHire: boolean }>();
  for (const row of rows ?? []) {
    const existingProgram = programs.get(row.program_title);
    programs.set(row.program_title, {
      category: row.category,
      count: (existingProgram?.count ?? 0) + 1,
    });
    if (!trainees.has(row.trainee_id)) {
      trainees.set(row.trainee_id, { fullName: row.full_name, photoUrl: row.photo_url, openToHire: row.open_to_hire });
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-8">
      <Link href="/directory" className="text-sm text-certified-muted underline">
        ← Back to directory
      </Link>

      <div className="flex flex-col items-center gap-4 text-center">
        {org.brand_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- issuer logos are arbitrary external Storage URLs
          <img src={org.brand_logo_url} alt={org.display_name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-certified-surface-2" />
        )}

        <div>
          <h1 className="font-display text-3xl text-certified-navy">{org.display_name}</h1>
          {location ? <p className="text-certified-muted">{location}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <GoldSeal size={40} idPrefix={`org-${org.id}`} />
          <span className="text-sm font-semibold text-certified-ink">Approved Issuer</span>
        </div>
      </div>

      {org.bio ? <p className="text-center text-certified-ink">{org.bio}</p> : null}
      {org.training_fields ? (
        <p className="text-center text-sm text-certified-muted">Trains in: {org.training_fields}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">Training programs</h2>
        {programs.size === 0 ? (
          <p className="text-certified-muted">No certificates issued under this org yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...programs.entries()].map(([title, info]) => (
              <div key={title} className="flex items-center justify-between rounded-card border border-certified-border bg-certified-surface p-4">
                <div>
                  <p className="text-certified-ink">{title}</p>
                  {info.category ? <p className="text-xs text-certified-muted">{info.category}</p> : null}
                </div>
                <span className="text-xs text-certified-muted">
                  {info.count} certified trainee{info.count === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">Certified trainee roster</h2>
        {trainees.size === 0 ? (
          <p className="text-certified-muted">No certified trainees to show yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...trainees.entries()].map(([traineeId, t]) => (
              <Link
                key={traineeId}
                href={`/directory/trainee/${traineeId}`}
                className="flex flex-col items-center gap-2 rounded-card border border-certified-border bg-certified-surface p-4 text-center transition hover:border-certified-gold"
              >
                {t.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- trainee photos are arbitrary external Storage URLs
                  <img src={t.photoUrl} alt={t.fullName} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-certified-surface-2" />
                )}
                <p className="text-sm text-certified-ink">{t.fullName}</p>
                {t.openToHire ? (
                  <span className="rounded-full bg-certified-success/10 px-2 py-0.5 text-xs font-semibold text-certified-success">
                    Open to hire
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col items-center gap-1 rounded-card border border-certified-border bg-certified-surface-2 p-4 text-center">
        <button
          type="button"
          disabled
          className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white opacity-40"
        >
          Contact {org.display_name}
        </button>
        <p className="text-xs text-certified-muted">Contact requests are coming in a later phase.</p>
      </div>
    </main>
  );
}
