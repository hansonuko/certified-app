-- Scope change: Certified → Certified Africa. Nigeria's State/LGA model
-- doesn't generalize across the continent (docs/blueprint.md §7 rewritten
-- accordingly) — this renames organizations' address columns to
-- country-agnostic names and adds the country itself, which the old model
-- never captured at all (every org was implicitly assumed Nigerian).
--
-- Kept to just the organizations table + its own public view in this file
-- (trainees gets its own file, 0017) — splitting per-table rather than one
-- combined migration, per the lock-contention lesson from 0012's original
-- deadlock (see that file's history): keeping each transaction's lock
-- surface to one table + its dependents avoids racing background
-- processes for locks across unrelated relations.
--
-- Renaming (not dropping + re-adding) preserves any data already in these
-- columns — moot today since organizations is empty in production
-- (confirmed docs/session-handoff.md §10), but the correct approach either
-- way.
alter table organizations rename column address_state to address_region;
alter table organizations rename column address_lga to address_locality;
alter table organizations add column address_country text;

comment on column organizations.address_region is
  'First-level administrative division (state/province/region/county — '
  'whatever the country calls it), free text. Structured selection for '
  'this happens in the UI (lib/geo/africa.ts) for a handful of priority '
  'countries; the column itself just stores whatever string resulted.';
comment on column organizations.address_locality is
  'City/district/LGA/municipality-equivalent, free text everywhere — see '
  'lib/geo/africa.ts for why this tier isn''t structured for any country.';

-- rc_number's original comment (0003) described it Nigeria-only ("RC number
-- (business) or NIN (individual trainer)") and is already stale even before
-- this rebrand (NIN was dropped in 0010) — 0003 is already live, so per this
-- project's own convention (see 0010's header comment) it's never edited in
-- place; this just re-documents the column going forward.
comment on column organizations.rc_number is
  'Business registration number, if the applicant has one — e.g. RC/CAC in '
  'Nigeria, or the equivalent registration number issued by the applicant''s '
  'own country''s business registry. Optional: individual trainers without '
  'a registered business (or applicants in a country without an equivalent '
  'concept) leave this blank. Uniqueness enforced where present (0010''s '
  'partial unique index, unchanged by this migration).';

-- organizations_public_view (0009) selected the old column names directly
-- as its output. CREATE OR REPLACE VIEW can only append new output columns
-- at the end — it refuses to rename or reorder any existing output column
-- (Postgres 42P16, "cannot change name of view column"), and address_state/
-- address_lga are being renamed here, not just added to. Drop and recreate
-- instead (same fix as 0015's verify_certificate() shape change); the
-- anon/authenticated grant is re-issued right after, since dropping a view
-- drops privileges granted on it too.
drop view if exists organizations_public_view;

create view organizations_public_view as
select
  id,
  display_name,
  brand_logo_url,
  brand_primary_color,
  address_country,
  address_region,
  address_locality
from organizations
where status = 'approved';

grant select on organizations_public_view to anon, authenticated;
