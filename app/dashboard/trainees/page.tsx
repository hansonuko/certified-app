import Link from 'next/link';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

// /dashboard/trainees (docs/build-phases.md Phase 4) — this org's full
// trainee roster, across every program. Each trainee only ever exists
// because a certificate created them (docs/blueprint.md §6 "no 'add
// trainee' without a linked certificate") — this page is a read-only
// roster view; editing a trainee's own profile is Phase 8's self-claim
// flow, and bulk add is Phase 7.
export default async function TraineesPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: trainees } = await supabase
    .from('trainees')
    .select('id, full_name, photo_url, state, lga, open_to_hire, training_programs(title)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Trainees</h1>

      {!trainees || trainees.length === 0 ? (
        <div className="rounded-card border border-certified-border bg-certified-surface p-6">
          <p className="text-certified-muted">
            No trainees yet — they&apos;re added as part of issuing a certificate.
          </p>
          <Link href="/dashboard/programs" className="mt-3 inline-block text-sm text-certified-navy underline">
            Go to programs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {trainees.map((t) => {
            const program = Array.isArray(t.training_programs) ? t.training_programs[0] : t.training_programs;
            return (
              <div key={t.id} className="flex flex-col gap-2 rounded-card border border-certified-border bg-certified-surface p-4">
                {t.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- trainee photos are arbitrary external Storage URLs, not a fixed local asset set worth configuring next/image for yet
                  <img src={t.photo_url} alt={t.full_name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-certified-surface-2" />
                )}
                <p className="text-certified-ink">{t.full_name}</p>
                <p className="text-sm text-certified-muted">{program?.title ?? '—'}</p>
                <p className="text-xs text-certified-muted">{[t.state, t.lga].filter(Boolean).join(', ') || 'No location set'}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
