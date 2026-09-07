import { getAccountLink } from '@/lib/auth/account-link';
import { SiteHeaderClient } from './SiteHeaderClient';

// Public shell header (docs/sitemap.md §8). Shared by the marketing pages
// (app/(marketing)), the directory (app/directory), verification
// (app/verify), and the auth pages (app/(auth)) — every surface docs/
// sitemap.md groups under "public". Server component so the account-link
// lookup (lib/auth/account-link.ts, needs next/headers via the server
// Supabase client) runs without a client round-trip; the interactive bits
// (mobile drawer, nav link data) live in SiteHeaderClient/site-nav.ts, which
// stay free of server-only imports so they're safe in the client bundle.
export async function SiteHeader() {
  const accountLink = await getAccountLink();
  return <SiteHeaderClient accountLink={accountLink} />;
}
