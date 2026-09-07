import { createClient } from '@/lib/supabase/server';

export type PublicStats = { approvedIssuers: number; certificatesIssued: number };

/**
 * Homepage stats (docs/sitemap.md §1: "stats — issuers approved, certificates
 * issued — once non-zero"). Both counts come from the same anon-readable
 * views the directory already queries (organizations_public_view,
 * directory_listings_view) — a `head: true` count is an aggregate, not a
 * listing of records, so this doesn't reopen CLAUDE.md rule #6's "no list
 * all certificates" restriction (docs/session-handoff.md §... discusses the
 * same distinction for directory_listings_view itself).
 */
export async function getPublicStats(): Promise<PublicStats> {
  const supabase = await createClient();
  const [{ count: approvedIssuers }, { count: certificatesIssued }] = await Promise.all([
    supabase.from('organizations_public_view').select('id', { count: 'exact', head: true }),
    supabase.from('directory_listings_view').select('certificate_id', { count: 'exact', head: true }),
  ]);

  return { approvedIssuers: approvedIssuers ?? 0, certificatesIssued: certificatesIssued ?? 0 };
}
