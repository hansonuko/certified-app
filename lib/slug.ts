import { randomBytes } from 'crypto';

/**
 * Org public-page slug generation (/directory/org/[slug],
 * docs/sitemap.md §3, supabase/migrations/0019). `display_name` isn't
 * unique (no constraint requires it), so every slug gets a short random
 * suffix rather than relying on the name alone — collisions are still
 * possible in theory (astronomically unlikely, same reasoning as
 * lib/certificates/public-id.ts), so callers retry with a fresh suffix on
 * a unique-constraint violation rather than this function guaranteeing
 * uniqueness itself.
 */
function slugifyBase(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'issuer';
}

function randomSuffix(): string {
  return randomBytes(3).toString('hex'); // 6 hex chars
}

export function generateOrgSlug(displayName: string): string {
  return `${slugifyBase(displayName)}-${randomSuffix()}`;
}
