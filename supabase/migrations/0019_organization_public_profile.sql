-- Phase 5, item 3 — issuer public page (docs/blueprint.md §3.5, §3.1 point 2:
-- "Sample of what they train (short description) — this becomes the public
-- 'training profile'"). Two gaps this closes, both flagged here rather than
-- built around silently:
--
-- 1. Organization had no public bio/training-fields columns at all —
--    docs/blueprint.md §3.1 captures `training_fields` and
--    `training_description` at application time and says they become the
--    public profile, but nothing ever copied them from
--    applications.submitted_data onto the organizations row itself. Added
--    here as `bio`/`training_fields`; app/staff/.../applications/[id]/
--    actions.ts populates them from submitted_data at approval time.
-- 2. docs/sitemap.md's own route for this page is `/directory/org/[slug]`,
--    not an id — organizations had no slug column to route on. Added here;
--    app/(auth)/apply/actions.ts generates one at application time
--    (slugified display_name + a short random suffix for uniqueness, same
--    collision-retry pattern as certificate public_id generation,
--    lib/certificates/public-id.ts).
--
-- `not null` on slug (no default) is safe without a backfill because
-- organizations is confirmed empty in production (docs/session-handoff.md
-- §10) — there are zero existing rows for the constraint to violate.
alter table organizations add column slug text not null unique;
alter table organizations add column bio text;
alter table organizations add column training_fields text;

comment on column organizations.slug is
  'URL slug for the public issuer page (/directory/org/[slug]) — generated '
  'at application time, never user-editable after the fact (changing it '
  'would break existing links/QR-adjacent references to the org''s page).';
comment on column organizations.bio is
  'Public "training profile" — copied from applications.submitted_data.'
  'training_description at approval time (docs/blueprint.md §3.1 point 2).';
comment on column organizations.training_fields is
  'Copied from applications.submitted_data.training_fields at approval '
  'time, same reasoning as bio above.';

-- organizations_public_view (0009, updated 0016): CREATE OR REPLACE VIEW
-- can append new output columns at the end without the DROP VIEW dance
-- 0016/0017 needed (that was for *renaming* existing output columns,
-- Postgres 42P16 — this is purely additive).
create or replace view organizations_public_view as
select
  id,
  display_name,
  brand_logo_url,
  brand_primary_color,
  address_country,
  address_region,
  address_locality,
  slug,
  bio,
  training_fields
from organizations
where status = 'approved';

grant select on organizations_public_view to anon, authenticated;

-- directory_listings_view (0018) needs the issuing org's slug too, so a
-- directory card or trainee profile can link through to the org's public
-- page without a second query. Column order/names for everything that
-- already existed in 0018 are kept byte-for-byte identical here and
-- issuer_slug is only appended at the very end — CREATE OR REPLACE VIEW
-- allows adding new output columns but not renaming or reordering existing
-- ones (Postgres 42P16, same lesson as 0016/0017).
create or replace view directory_listings_view as
select
  t.id as trainee_id,
  t.full_name,
  t.photo_url,
  t.bio,
  t.open_to_hire,
  t.country,
  t.region,
  t.locality,
  c.id as certificate_id,
  c.public_id,
  c.program_title_snapshot as program_title,
  c.completion_date,
  tp.category,
  o.id as org_id,
  o.display_name as issuer_display_name,
  o.brand_logo_url as issuer_logo_url,
  o.slug as issuer_slug
from trainees t
join certificates c on c.trainee_id = t.id and c.status = 'active'
join organizations o on o.id = c.org_id and o.status = 'approved'
left join training_programs tp on tp.id = c.program_id
where t.is_hidden = false;

grant select on directory_listings_view to anon, authenticated;
