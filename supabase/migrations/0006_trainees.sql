-- Trainee (docs/blueprint.md §4) — public directory profile. Two additions
-- beyond the blueprint's literal field list, both needed to make an RLS
-- policy enforceable and flagged here rather than applied silently:
--
-- 1. `claimed_by_user_id` — the blueprint has `claimed (bool)` and
--    `claim_token` but no link to the auth.users row a trainee claims their
--    profile with (docs/blueprint.md §3.5, Phase 8 self-claim). Without it,
--    "a claimed trainee can edit their own profile" has nothing to check.
-- 2. `is_hidden` / `flagged_reason` — blueprint §4 has no distinct
--    "moderation" entity, but docs/roles-permissions.md §2 gives Account
--    Manager "moderate directory content (hide/flag bios, photos,
--    listings)" as a capability. Trainee rows are the thing being
--    moderated, so these columns live here rather than inventing a
--    separate moderation table for a capability blueprint didn't model as
--    its own entity.
--
-- CLAUDE.md rule #5 (contact gated by default): phone/email live here for
-- issuer/staff/self-management use, but no anon-facing view in
-- 0009_public_and_finance_views.sql ever selects them — the reveal/relay
-- flow (Phase 6) reads them server-side via lib/supabase/admin.ts, not
-- through anon RLS.

create table trainees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  program_id uuid references training_programs (id) on delete set null,
  full_name text not null,
  photo_url text,
  bio text,
  phone text,
  email text,
  contact_visibility contact_visibility not null default 'gated',
  open_to_hire boolean not null default false,
  state text,
  lga text,
  claimed boolean not null default false,
  claimed_by_user_id uuid references auth.users (id),
  claim_token text unique,
  is_hidden boolean not null default false,
  flagged_reason text,
  created_at timestamptz not null default now()
);

alter table trainees enable row level security;

-- Issuer: read + write their own org's roster.
create policy trainees_owner_all on trainees
  for all
  using (org_id in (select id from organizations where owner_user_id = auth.uid()))
  with check (org_id in (select id from organizations where owner_user_id = auth.uid()));

-- Claimed trainee: read + write their own profile (bio, photo, visibility,
-- open_to_hire) once claimed — docs/blueprint.md §3.5 / Phase 8. Trigger
-- below still blocks self-service edits to moderation/claim-control columns.
create policy trainees_self_all on trainees
  for all
  using (claimed_by_user_id = auth.uid())
  with check (claimed_by_user_id = auth.uid());

-- Admin + Account Manager: full read/write, including moderation
-- (docs/roles-permissions.md §2). Finance gets no policy here.
create policy trainees_staff_all on trainees
  for all
  using (is_admin() or is_account_manager())
  with check (is_admin() or is_account_manager());

-- Neither an issuer nor a claimed trainee should be able to hide/unhide
-- their own listing, flag themselves, force claimed=true without going
-- through the real claim flow, or hand their profile to a different
-- claim_by_user_id — those are moderation/claim-mechanics columns, staff-
-- or system-only.
create or replace function guard_trainee_moderation_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_staff() then
    if new.is_hidden is distinct from old.is_hidden
      or new.flagged_reason is distinct from old.flagged_reason
      or new.claimed is distinct from old.claimed
      or new.claimed_by_user_id is distinct from old.claimed_by_user_id
      or new.claim_token is distinct from old.claim_token then
      raise exception 'moderation and claim-mechanics columns can only be changed by staff or the claim flow';
    end if;
  end if;
  return new;
end;
$$;

create trigger trainees_guard_moderation_columns
  before update on trainees
  for each row
  execute function guard_trainee_moderation_columns();
