-- Phase 6 (docs/blueprint.md §6) — the trainee contact relay needs to know
-- contact_visibility to decide whether to show the Contact action at all
-- ('hidden' suppresses it entirely; 'public' and 'gated' both relay, since
-- the confirmed "no public opt-out" decision, docs/blueprint.md §11 item 2,
-- means raw contact info is never directly exposed either way — see
-- app/directory/trainee/[id]/page.tsx for where that reading is applied).
-- directory_listings_view (0018, extended 0019) didn't select this column
-- yet. Purely additive — appended at the end, nothing renamed/reordered, so
-- no DROP VIEW needed (Postgres 42P16 only blocks the rename/reorder case).
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
  o.slug as issuer_slug,
  t.contact_visibility
from trainees t
join certificates c on c.trainee_id = t.id and c.status = 'active'
join organizations o on o.id = c.org_id and o.status = 'approved'
left join training_programs tp on tp.id = c.program_id
where t.is_hidden = false;

grant select on directory_listings_view to anon, authenticated;
