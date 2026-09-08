import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DirectoryFilters } from './DirectoryFilters';
import { INTERACTIVE_CARD_CLASSNAME } from '@/components/ui/Card';

// docs/build-phases.md Phase 5, docs/blueprint.md §3.5/§7. Public,
// unauthenticated, reads directory_listings_view (supabase/migrations/0018)
// — the one deliberate anon-facing listing surface over certificates (see
// that migration's header comment for why this doesn't conflict with
// verify_certificate()'s "no enumeration" rule: this *is* the platform's
// sanctioned public directory, not a side door into it).
const PAGE_SIZE = 20;
// v1 scale limit, not a hard architectural one: directory_listings_view is
// one row per (trainee, active certificate), so a trainee with several
// certificates occupies several rows. Grouping those into one card per
// trainee happens in JS below, which means true distinct-trainee pagination
// would need a separate aggregating query. At launch scale (a directory
// that doesn't exist yet) that's not worth building — instead this fetches
// up to MAX_ROWS matching certificate-rows, groups them, and paginates the
// grouped trainee list in memory. Revisit with a real aggregated query (or
// a materialized view) if the directory ever grows past a few thousand
// certificates.
const MAX_ROWS = 600;

type DirectoryRow = {
  trainee_id: string;
  full_name: string;
  photo_url: string | null;
  bio: string | null;
  open_to_hire: boolean;
  country: string | null;
  region: string | null;
  locality: string | null;
  certificate_id: string;
  public_id: string;
  program_title: string;
  completion_date: string;
  category: string | null;
  org_id: string;
  issuer_display_name: string;
  issuer_logo_url: string | null;
};

type Credential = { publicId: string; programTitle: string; completionDate: string; issuerName: string };
type TraineeCard = {
  traineeId: string;
  fullName: string;
  photoUrl: string | null;
  bio: string | null;
  openToHire: boolean;
  country: string | null;
  region: string | null;
  locality: string | null;
  credentials: Credential[];
};

function sanitizeSearchTerm(raw: string): string {
  // Strips characters with syntactic meaning inside a Supabase/PostgREST
  // .or() filter string (comma separates conditions, parens aren't valid
  // inside a bare value) — not a security boundary, PostgREST still
  // parameterizes the actual comparison value either way, this just keeps
  // the filter string well-formed so a stray "," doesn't 400 the query.
  return raw.replace(/[,()]/g, '').trim();
}

function groupByTrainee(rows: DirectoryRow[]): TraineeCard[] {
  const byTrainee = new Map<string, TraineeCard>();
  for (const row of rows) {
    const existing = byTrainee.get(row.trainee_id);
    const credential: Credential = {
      publicId: row.public_id,
      programTitle: row.program_title,
      completionDate: row.completion_date,
      issuerName: row.issuer_display_name,
    };
    if (existing) {
      existing.credentials.push(credential);
    } else {
      byTrainee.set(row.trainee_id, {
        traineeId: row.trainee_id,
        fullName: row.full_name,
        photoUrl: row.photo_url,
        bio: row.bio,
        openToHire: row.open_to_hire,
        country: row.country,
        region: row.region,
        locality: row.locality,
        credentials: [credential],
      });
    }
  }
  return [...byTrainee.values()];
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    country?: string;
    region?: string;
    issuer?: string;
    from?: string;
    to?: string;
    open_to_hire?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase.from('directory_listings_view').select('*');

  const q = params.q ? sanitizeSearchTerm(params.q) : '';
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,program_title.ilike.%${q}%,category.ilike.%${q}%`);
  }
  if (params.country) query = query.eq('country', params.country);
  if (params.region) query = query.eq('region', params.region);
  if (params.issuer) query = query.eq('org_id', params.issuer);
  if (params.from) query = query.gte('completion_date', params.from);
  if (params.to) query = query.lte('completion_date', params.to);
  if (params.open_to_hire === '1') query = query.eq('open_to_hire', true);

  const [{ data: rows }, { data: issuers }] = await Promise.all([
    query.order('completion_date', { ascending: false }).limit(MAX_ROWS),
    supabase.from('organizations_public_view').select('id, display_name').order('display_name'),
  ]);

  const allCards = groupByTrainee((rows as DirectoryRow[] | null) ?? []);
  const totalPages = Math.max(1, Math.ceil(allCards.length / PAGE_SIZE));
  const cards = allCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const queryStringWithoutPage = new URLSearchParams(
    Object.entries(params).filter(([k, v]) => k !== 'page' && v),
  ).toString();
  const pageHref = (p: number) => `/directory?${queryStringWithoutPage}${queryStringWithoutPage ? '&' : ''}page=${p}`;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-3xl text-certified-navy">Find a certified professional</h1>
        <p className="text-certified-muted">Search certified individuals by skill, location, or issuing organization.</p>
      </div>

      <DirectoryFilters issuers={issuers ?? []} defaults={params} />

      {cards.length === 0 ? (
        <div className="rounded-card border border-certified-border bg-certified-surface p-6">
          <p className="text-certified-muted">No certified individuals match those filters yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <TraineeDirectoryCard key={card.traineeId} card={card} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-certified-navy underline">
              Previous
            </Link>
          ) : null}
          <span className="text-certified-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="text-certified-navy underline">
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}

function TraineeDirectoryCard({ card }: { card: TraineeCard }) {
  const location = [card.locality, card.region, card.country].filter(Boolean).join(', ');
  const primary = card.credentials[0];

  return (
    <Link
      href={`/directory/trainee/${card.traineeId}`}
      className={`flex flex-col gap-3 p-5 ${INTERACTIVE_CARD_CLASSNAME}`}
    >
      <div className="flex items-center gap-3">
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- trainee photos are arbitrary external Storage URLs
          <img src={card.photoUrl} alt={card.fullName} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-certified-surface-2" />
        )}
        <div>
          <p className="font-display text-lg text-certified-navy">{card.fullName}</p>
          {location ? <p className="text-xs text-certified-muted">{location}</p> : null}
        </div>
      </div>

      <p className="text-sm text-certified-ink">
        {primary.programTitle}
        {card.credentials.length > 1 ? ` +${card.credentials.length - 1} more` : ''}
      </p>
      <p className="text-xs text-certified-muted">Certified by {primary.issuerName}</p>

      {card.bio ? <p className="line-clamp-2 text-sm text-certified-muted">{card.bio}</p> : null}

      {card.openToHire ? (
        <span className="w-fit rounded-full bg-certified-success/10 px-3 py-1 text-xs font-semibold text-certified-success">
          Open to hire
        </span>
      ) : null}
    </Link>
  );
}
