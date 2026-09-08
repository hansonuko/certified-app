/**
 * Shared by every directory-style search (app/directory/page.tsx,
 * app/directory/organizations/page.tsx) that builds a Supabase/PostgREST
 * `.or()` filter string from free-text user input. Strips characters with
 * syntactic meaning inside that filter string (comma separates conditions,
 * parens aren't valid inside a bare value) — not a security boundary,
 * PostgREST still parameterizes the actual comparison value either way,
 * this just keeps the filter string well-formed so a stray "," doesn't
 * 400 the query.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()]/g, '').trim();
}
