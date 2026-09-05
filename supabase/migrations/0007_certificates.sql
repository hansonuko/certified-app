-- Certificate (docs/blueprint.md §4). *_snapshot columns are written once at
-- issuance and never overwritten by later profile edits (CLAUDE.md rule #4) —
-- enforced below by trigger, the same way status columns are guarded on
-- organizations/applications.
--
-- Deliberate design choice, flagged for review rather than applied silently:
-- this table has NO insert/update/delete RLS policy for anyone, including
-- Admin. Issuance needs a server-computed signature_hash from a secret that
-- never touches the client (CLAUDE.md rule #3), and every status change
-- (issue, revoke, expire) must pair with an AuditLog row with no decision
-- path skipping it (CLAUDE.md rule #7). Rather than duplicate those
-- guarantees as RLS policies AND as application logic, all writes go through
-- API routes using lib/supabase/admin.ts (service role, bypasses RLS)
-- after a `can(role, action)` check — one enforcement path, not two that can
-- drift apart. RLS here only ever grants SELECT.

create table certificates (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique, -- e.g. CERT-8F2K9-XQ41 (docs/blueprint.md §3.4), generated at issuance
  trainee_id uuid not null references trainees (id) on delete restrict,
  org_id uuid not null references organizations (id) on delete restrict,
  program_id uuid references training_programs (id) on delete set null,

  trainee_name_snapshot text not null,
  program_title_snapshot text not null,
  completion_date date not null,
  grade text,
  issue_date date not null default current_date,
  expiry_date date,

  status certificate_status not null default 'active',
  revoked_reason text,
  revoked_at timestamptz,

  signature_hash text not null, -- server-computed only, lib/certificates/sign.ts (CLAUDE.md rule #3)
  pdf_url text,
  created_at timestamptz not null default now()
);

comment on table certificates is
  'Snapshots, not live references (CLAUDE.md rule #4) — trainee_name_snapshot '
  'and program_title_snapshot are frozen at issuance. Verification reads this '
  'table (via certificates_public_view, 0009_public_and_finance_views.sql), '
  'never the live Trainee/TrainingProgram rows, which is what makes a '
  'certificate still verify correctly after a trainee edits their bio or an '
  'org renames itself.';

create index certificates_public_id_idx on certificates (public_id);
create index certificates_org_id_idx on certificates (org_id);
create index certificates_trainee_id_idx on certificates (trainee_id);

alter table certificates enable row level security;

-- Issuer: read-only on their own org's certificates (view/download what's
-- been issued). No write policy — see the table-level comment above.
create policy certificates_owner_select on certificates
  for select
  using (org_id in (select id from organizations where owner_user_id = auth.uid()));

-- Admin + Account Manager: read all certificates (docs/roles-permissions.md
-- §2 "View platform-wide certificates & issuance data" + "Revoke a
-- certificate"). Revocation itself is a service-role write from an API route
-- per the table-level comment, gated by can(role, 'revoke_certificate') in
-- lib/permissions.ts, not a direct RLS UPDATE grant.
create policy certificates_staff_select on certificates
  for select
  using (is_admin() or is_account_manager());

-- Finance gets no policy on this base table — matrix row "View platform-wide
-- certificates & issuance data: Finance ✅ (aggregate/statistical view only,
-- not individual PII)" is a column/row-aggregation limit RLS can't express;
-- see certificates_finance_view (0009_public_and_finance_views.sql).

create or replace function guard_certificate_snapshot_columns()
returns trigger
language plpgsql
as $$
begin
  if new.trainee_name_snapshot is distinct from old.trainee_name_snapshot
    or new.program_title_snapshot is distinct from old.program_title_snapshot
    or new.completion_date is distinct from old.completion_date
    or new.signature_hash is distinct from old.signature_hash then
    raise exception 'snapshot fields are immutable after issuance (CLAUDE.md rule #4)';
  end if;
  return new;
end;
$$;

create trigger certificates_guard_snapshot_columns
  before update on certificates
  for each row
  execute function guard_certificate_snapshot_columns();
