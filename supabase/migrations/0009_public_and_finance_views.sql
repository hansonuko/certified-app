-- Views and functions that carry the column-level and listing restrictions
-- RLS itself can't express (RLS filters rows, not columns or enumeration).
--
-- All four views below are deliberately plain views (no `security_invoker`),
-- which in Postgres means they run with the privileges of the view's OWNER —
-- the migration-running role, which in Supabase has BYPASSRLS — rather than
-- the querying role's own privileges. That's what makes column-level
-- restriction actually hold: anon and Finance are never granted SELECT on
-- the base organizations/certificates/trainees tables at all (Supabase's
-- default grants to anon/authenticated notwithstanding — RLS on those tables
-- has no policy admitting anon or Finance, so direct table queries return
-- nothing for them), so the *only* way either role can read this data is
-- through these views, which is where the safe column list is enforced. A
-- `security_invoker = true` view would defeat this entirely: it would
-- require anon/Finance to have their own table-level grant to work, and
-- that same grant would let them bypass the view and query the base table's
-- full column list directly.

-- Placeholder for post-monetization billing (docs/roles-permissions.md §1
-- "Finance ... billing, invoicing, and plan management once monetization
-- ships", docs/build-phases.md Phase 9). Not in docs/blueprint.md §4's field
-- list because monetization hasn't shipped — added here, next to the first
-- thing that actually reads it, rather than backdated into 0003.
alter table organizations add column plan text;

-- === Finance-facing views (docs/roles-permissions.md §2) ===================
-- No RLS policy on organizations/certificates admits Finance — these views
-- are Finance's only read path onto either table (see file header).

-- "limited columns: name, plan, status, usage" — never KYC fields
-- (owner_id_document_url, owner_nin) or raw contact fields (owner_phone,
-- owner_email). usage is derived (issued certificate count) rather than a
-- stored column, since nothing in docs/blueprint.md §4 tracks per-org usage
-- yet.
-- Postgres GRANTs are all-or-nothing per role, and Supabase only gives us
-- anon/authenticated/service_role to grant to — there's no native "finance"
-- role to grant SELECT to directly. So `authenticated` gets the GRANT (any
-- signed-in user could otherwise be refused at that layer alone), and the
-- `is_finance()`/`is_admin()` check is baked into the view's own WHERE
-- clause instead — an issuer or Account Manager querying this view gets
-- zero rows back, not an error, not real data.
create view organizations_finance_view as
select
  o.id,
  o.display_name as name,
  o.plan,
  o.status,
  (select count(*) from certificates c where c.org_id = o.id) as certificates_issued
from organizations o
where is_finance() or is_admin();

grant select on organizations_finance_view to authenticated;

-- Aggregate/statistical only, never individual certificate/trainee PII
-- (docs/roles-permissions.md §2). Same self-filtering reasoning as above.
create view certificates_finance_view as
select
  org_id,
  status,
  date_trunc('month', issue_date)::date as issue_month,
  count(*) as certificate_count
from certificates
where is_finance() or is_admin()
group by org_id, status, date_trunc('month', issue_date);

grant select on certificates_finance_view to authenticated;

-- === Public-facing views (anon — CLAUDE.md rules #5, #6) ===================
-- No RLS policy on organizations/trainees admits anon — same reasoning as
-- the finance views above, just for the anon role instead.

-- Directory + verification page "Approved Issuer" badge: display_name and
-- brand only, for approved orgs only. Never owner_*, address_street,
-- rc_number, or plan.
create view organizations_public_view as
select
  id,
  display_name,
  brand_logo_url,
  brand_primary_color,
  address_state,
  address_lga
from organizations
where status = 'approved';

grant select on organizations_public_view to anon, authenticated;

-- Public directory: trainees with at least one active certificate, not
-- hidden by moderation. Never phone, email, or claim_token — the reveal/relay
-- flow (Phase 6) reads those server-side via lib/supabase/admin.ts, never
-- through this view (CLAUDE.md rule #5).
create view trainees_public_view as
select
  t.id,
  t.org_id,
  t.full_name,
  t.photo_url,
  t.bio,
  t.contact_visibility,
  t.open_to_hire,
  t.state,
  t.lga
from trainees t
where t.is_hidden = false
  and exists (select 1 from certificates c where c.trainee_id = t.id and c.status = 'active');

grant select on trainees_public_view to anon, authenticated;

-- Verification (docs/blueprint.md §3.4) is intentionally a function, not a
-- selectable view: CLAUDE.md rule #6 requires the verification endpoint to
-- never expose a "list all certificates"/"list all IDs" capability. Even a
-- correctly column-limited view would still let anon run
-- `select * from that_view` with no filter and list every certificate — a
-- view can't force the caller to supply a WHERE clause. A SECURITY DEFINER
-- function that takes exactly one public_id and returns at most one row has
-- no enumeration path, which is what makes this safe to expose to anon.
create or replace function verify_certificate(p_public_id text)
returns table (
  public_id text,
  trainee_name text,
  program_title text,
  issuer_display_name text,
  completion_date date,
  issue_date date,
  expiry_date date,
  status certificate_status,
  grade text,
  pdf_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.public_id,
    c.trainee_name_snapshot,
    c.program_title_snapshot,
    o.display_name,
    c.completion_date,
    c.issue_date,
    c.expiry_date,
    c.status,
    c.grade,
    c.pdf_url
  from certificates c
  join organizations o on o.id = c.org_id
  where c.public_id = p_public_id;
$$;

comment on function verify_certificate is
  'The only anon-facing read path onto certificates (CLAUDE.md rule #6) — one '
  'public_id in, at most one row out, no enumeration. Rate-limiting per IP '
  '(Upstash) happens in the API route that calls this (docs/build-phases.md '
  'Phase 4), not here.';

grant execute on function verify_certificate(text) to anon, authenticated;
