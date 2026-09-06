-- Scope change: Certified → Certified Africa, part 2 (see 0016's header for
-- the full rationale). Same rename-and-add treatment for trainees' location
-- columns, kept in its own file for the same lock-contention reasoning.
alter table trainees rename column state to region;
alter table trainees rename column lga to locality;
alter table trainees add column country text;

comment on column trainees.region is
  'First-level administrative division (state/province/region/county), '
  'free text — see organizations.address_region (0016) and lib/geo/africa.ts.';
comment on column trainees.locality is
  'City/district/LGA/municipality-equivalent, free text — see '
  'organizations.address_locality (0016) and lib/geo/africa.ts.';

-- trainees_public_view (0009) selected the old column names directly;
-- CREATE OR REPLACE VIEW picks up the rename and adds country to the
-- directory-facing output (Phase 5 will filter by it).
create or replace view trainees_public_view as
select
  t.id,
  t.org_id,
  t.full_name,
  t.photo_url,
  t.bio,
  t.contact_visibility,
  t.open_to_hire,
  t.country,
  t.region,
  t.locality
from trainees t
where t.is_hidden = false
  and exists (select 1 from certificates c where c.trainee_id = t.id and c.status = 'active');

grant select on trainees_public_view to anon, authenticated;
