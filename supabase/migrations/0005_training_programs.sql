-- TrainingProgram (docs/blueprint.md §4). Not exposed to anon directly —
-- verification and the public directory read Certificate's own
-- program_title_snapshot (0007_certificates.sql), never this table, so a
-- program can be edited/renamed after issuance without altering what past
-- certificates say they were for (docs/blueprint.md §4 "Key design choice").

create table training_programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  description text,
  category text, -- blueprint's "field/category"
  duration text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

alter table training_programs enable row level security;

-- Issuer: read + write only their own org's programs.
create policy training_programs_owner_all on training_programs
  for all
  using (org_id in (select id from organizations where owner_user_id = auth.uid()))
  with check (org_id in (select id from organizations where owner_user_id = auth.uid()));

-- Admin + Account Manager: full read/write, for support and moderation
-- purposes (docs/roles-permissions.md §2 "manages issuer support"). Finance
-- gets no policy here — training program details aren't a financial/usage
-- surface.
create policy training_programs_staff_all on training_programs
  for all
  using (is_admin() or is_account_manager())
  with check (is_admin() or is_account_manager());
