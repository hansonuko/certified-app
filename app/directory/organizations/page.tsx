import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DirectoryTabs } from '@/components/directory/DirectoryTabs';
import { OrganizationSearchFilters } from './OrganizationSearchFilters';
import { sanitizeSearchTerm } from '@/lib/directory/sanitize-search-term';
import { INTERACTIVE_CARD_CLASSNAME } from '@/components/ui/Card';

// Public, unauthenticated search/browse over approved organizations
// (organizations_public_view, supabase/migrations/0019) — the "Find an
// issuer" counterpart to the trainee-focused ../page.tsx. Before this,
// there was no way to discover an approved organization on the site at
// all except by clicking through a trainee's card to their issuer.
//
// Unlike the trainee directory, this view is one row per organization —
// no fan-out to group in JS — so this uses real SQL-level range pagination
// with an exact count instead of that page's in-memory slice-after-fetch
// approach.
const PAGE_SIZE = 20;

type OrgRow = {
  id: string;
  display_name: string;
  brand_logo_url: string | null;
  address_country: string | null;
  address_region: string | null;
  address_locality: string | null;
  slug: string;
  bio: string | null;
  training_fields: string | null;
};

export default async function OrganizationDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase
    .from('organizations_public_view')
    .select('id, display_name, brand_logo_url, address_country, address_region, address_locality, slug, bio, training_fields', {
      count: 'exact',
    });

  const q = params.q ? sanitizeSearchTerm(params.q) : '';
  if (q) {
    query = query.or(
      `display_name.ilike.%${q}%,bio.ilike.%${q}%,training_fields.ilike.%${q}%,address_country.ilike.%${q}%,address_region.ilike.%${q}%,address_locality.ilike.%${q}%`,
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: rows, count } = await query.order('display_name').range(from, from + PAGE_SIZE - 1);

  const orgs = (rows as OrgRow[] | null) ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const pageHref = (p: number) => `/directory/organizations?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${p}`;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-3xl text-certified-navy">Find a certified issuer</h1>
        <p className="text-certified-muted">
          Search approved training centres, vocational institutes, and independent trainers by name, description,
          training field, or location.
        </p>
      </div>

      <DirectoryTabs active="organizations" />

      <OrganizationSearchFilters defaults={params} />

      {orgs.length === 0 ? (
        <div className="rounded-card border border-certified-border bg-certified-surface p-6">
          <p className="text-certified-muted">No approved issuers match that search yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <OrganizationCard key={org.id} org={org} />
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

function OrganizationCard({ org }: { org: OrgRow }) {
  const location = [org.address_locality, org.address_region, org.address_country].filter(Boolean).join(', ');

  return (
    <Link href={`/directory/org/${org.slug}`} className={`flex flex-col gap-3 p-5 ${INTERACTIVE_CARD_CLASSNAME}`}>
      <div className="flex items-center gap-3">
        {org.brand_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- issuer logos are arbitrary external Storage URLs
          <img src={org.brand_logo_url} alt={org.display_name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-certified-surface-2" />
        )}
        <div>
          <p className="font-display text-lg text-certified-navy">{org.display_name}</p>
          {location ? <p className="text-xs text-certified-muted">{location}</p> : null}
        </div>
      </div>

      {org.training_fields ? <p className="text-sm text-certified-ink">{org.training_fields}</p> : null}
      {org.bio ? <p className="line-clamp-2 text-sm text-certified-muted">{org.bio}</p> : null}
    </Link>
  );
}
