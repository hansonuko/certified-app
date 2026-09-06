-- Phase 5 — public directory & search (docs/blueprint.md §3.5, §7).
--
-- Worth being explicit about a tension with CLAUDE.md rule #6 and
-- docs/blueprint.md §6's "Certificate ID guessing / enumeration" mitigation
-- (verify_certificate(), 0009/0015, deliberately has no listing capability):
-- this view IS a listing capability over certificates, on purpose. Those
-- earlier rules are about the *verification* single-lookup endpoint never
-- becoming a bulk-enumeration path outside its intended discovery flow —
-- they were never meant to block the directory itself, which
-- docs/blueprint.md's 4th pillar ("Public Directory & Hire Layer") and §3.5
-- explicitly design as a public, searchable, browsable listing of certified
-- individuals and their certificates. This view is that sanctioned listing
-- surface, scoped tightly: active certificates only, approved orgs only,
-- non-hidden trainees only, and never phone/email (CLAUDE.md rule #5,
-- same exclusion trainees_public_view already makes).
--
-- One row per (trainee, active certificate) rather than per trainee, so a
-- trainee with multiple certificates/programs can be filtered on any of
-- them — the application layer groups rows back into one card per trainee
-- when rendering the list.
create view directory_listings_view as
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
  o.brand_logo_url as issuer_logo_url
from trainees t
join certificates c on c.trainee_id = t.id and c.status = 'active'
join organizations o on o.id = c.org_id and o.status = 'approved'
left join training_programs tp on tp.id = c.program_id
where t.is_hidden = false;

grant select on directory_listings_view to anon, authenticated;

-- Supporting indexes for the filters docs/blueprint.md §3.5 calls for
-- (field/skill, country/region/locality, issuer, completion-date range).
-- v1 search is plain ILIKE, not full-text/tsvector — the free-text fields
-- here (category, program title, trainee name, bio) are short and
-- low-volume enough at launch scale that a GIN/trigram index isn't worth
-- the setup cost yet; revisit if directory search volume or dataset size
-- ever makes ILIKE scans a real cost.
create index trainees_country_idx on trainees (country) where is_hidden = false;
create index trainees_region_idx on trainees (region) where is_hidden = false;
create index certificates_status_completion_date_idx on certificates (status, completion_date);
create index training_programs_category_idx on training_programs (category);
