-- Application (docs/blueprint.md §4) — versioned submissions tied to an
-- Organization. Resubmission has no cooldown (docs/blueprint.md §6, Sybil
-- loophole row), so one org can accumulate multiple Application rows over
-- time; the org's own `status` (0003_organizations.sql) reflects the latest
-- decision.

create table applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  submitted_data jsonb not null,
  status application_status not null default 'pending',
  agent_notes jsonb not null default '[]'::jsonb,
  decision_history jsonb not null default '[]'::jsonb, -- [{ agent_id, action, reason, at }]
  created_at timestamptz not null default now()
);

comment on table applications is
  'Applicant-facing status page (docs/blueprint.md §3.1) reads this table for '
  'its own org. decision_history/agent_notes are populated by staff decisions '
  '(docs/roles-permissions.md §2); every entry has a matching AuditLog row '
  '(CLAUDE.md rule #7) — this column is a denormalized read model for the '
  'applicant''s status page, not the audit trail of record.';

alter table applications enable row level security;

-- Applicant: read + write applications under their own organization
-- (docs/roles-permissions.md §2). Write access here is for the initial
-- submission and for resubmitting submitted_data after a
-- more_info_requested decision — status/agent_notes/decision_history are
-- staff-only, guarded below by trigger for the same reason as
-- organizations.status (RLS can gate rows, not individual columns).
create policy applications_owner_all on applications
  for all
  using (org_id in (select id from organizations where owner_user_id = auth.uid()))
  with check (org_id in (select id from organizations where owner_user_id = auth.uid()));

-- Admin + Account Manager: full read/write, per docs/roles-permissions.md §2
-- ("Review & decide applications" + "View applicant KYC documents" are both
-- ✅ for these two roles). Finance is deliberately excluded — no policy
-- grants Finance any access to this table (matrix: applications review is
-- ❌ Finance, and submitted_data may carry KYC-adjacent fields).
create policy applications_staff_all on applications
  for all
  using (is_admin() or is_account_manager())
  with check (is_admin() or is_account_manager());

create or replace function guard_application_status_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_staff() then
    if new.status is distinct from old.status
      or new.agent_notes is distinct from old.agent_notes
      or new.decision_history is distinct from old.decision_history then
      raise exception 'status, agent_notes, and decision_history can only be changed by staff';
    end if;
  end if;
  return new;
end;
$$;

create trigger applications_guard_status_columns
  before update on applications
  for each row
  execute function guard_application_status_columns();
