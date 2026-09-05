-- AuditLog (docs/blueprint.md §4). Every admin decision writes a row here
-- (CLAUDE.md rule #7) — no decision path skips it. Like certificates, this
-- table has no INSERT/UPDATE/DELETE policy for anyone: writes happen from
-- the same server-side code path that makes the decision (using
-- lib/supabase/admin.ts), so a write can never happen without the decision
-- it's supposed to record, and an audit row can never be edited or deleted
-- after the fact by anyone, including Admin, through the normal client.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references admin_users (id), -- null when actor_type = 'system' (e.g. bootstrap)
  actor_type text not null check (actor_type in ('system', 'staff')),
  action text not null,
  target_type text not null,
  target_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index audit_log_actor_id_idx on audit_log (actor_id);
create index audit_log_target_idx on audit_log (target_type, target_id);

alter table audit_log enable row level security;

-- Admin: read the full log (docs/roles-permissions.md §2).
create policy audit_log_admin_select on audit_log
  for select
  using (is_admin());

-- Account Manager + Finance: read only their own actions
-- (docs/roles-permissions.md §2 "own actions only"). Applies automatically
-- to whoever navigates to /staff/audit-log directly, per
-- docs/build-phases.md Phase 2.75 — this is the actual scoping, not just a
-- UI filter.
create policy audit_log_self_select on audit_log
  for select
  using (actor_id = auth.uid());
