-- Read-only helpers for /staff/finance's usage-vs-free-tier dashboard
-- (docs/build-phases.md Phase 9). Supabase's own free-tier database-size
-- and storage-size ceilings (500MB / 1GB) can't be read through the normal
-- PostgREST `public`-schema API — pg_database_size() needs catalog access,
-- and storage.objects lives in the `storage` schema, which this project's
-- PostgREST config doesn't expose (only public/graphql_public are —
-- confirmed live: querying `.schema('storage')` from the service-role
-- client returns PGRST106 "Invalid schema: storage"). A SECURITY DEFINER
-- function in the `public` schema sidesteps that entirely: the function
-- itself can read another schema internally, and PostgREST only ever sees
-- a normal public-schema RPC call — no dashboard "exposed schemas" setting
-- change needed. Resend/Upstash/Vercel usage have no equivalent
-- in-database source at all, so those three stay manual entry
-- (docs/build-phases.md Phase 9's own "Vercel function invocation count if
-- available via API/manual entry" language — extended here to all three,
-- see lib/usage/free-tier.ts's own comments for why).

create or replace function get_database_size_bytes()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select pg_database_size(current_database());
$$;

comment on function get_database_size_bytes() is
  'Total Postgres database size in bytes, for the /staff/finance usage '
  'dashboard (docs/build-phases.md Phase 9). SECURITY DEFINER since '
  'pg_database_size() needs superuser-ish catalog access that the anon/ '
  'authenticated roles don''t have directly; callers are gated by '
  'lib/permissions.ts''s view_cost_usage_dashboard check in application '
  'code, not by a grant on this function, so keep this read-only (it is) '
  'if anyone widens who can call it later.';

create or replace function get_storage_size_bytes()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(((metadata->>'size'))::bigint), 0) from storage.objects;
$$;

comment on function get_storage_size_bytes() is
  'Total Supabase Storage size in bytes across every bucket, for the '
  '/staff/finance usage dashboard (docs/build-phases.md Phase 9). '
  'SECURITY DEFINER so it can read storage.objects (a schema this '
  'project''s PostgREST config doesn''t expose directly) without changing '
  'that config; same access-gating note as get_database_size_bytes() '
  'above.';

-- No RLS grant changes needed: only called from the service-role client in
-- app/staff/(console)/finance, same as every other admin-only aggregate
-- query in this codebase (docs/roles-permissions.md §3).
