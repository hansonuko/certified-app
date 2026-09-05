-- AdminUser (docs/blueprint.md §4) — internal staff only. `id` is the same uuid
-- as the corresponding auth.users row (this table exists ONLY for staff; an
-- issuer/applicant auth user has no row here — that absence is itself part of
-- how "issuer and staff sessions never cross over" is enforced, see
-- lib/auth/staff.ts).
--
-- The very first row in this table can only be created by the bootstrap
-- script (scripts/bootstrap-admin.ts, docs/roles-permissions.md §4), which
-- refuses unconditionally once count(*) > 0 (CLAUDE.md rule #10) — that check
-- lives in application code, not here, because "refuse once any row exists"
-- isn't expressible as a table constraint.

create table admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role admin_role not null,
  status admin_status not null default 'active',
  invited_by uuid references admin_users (id),
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table admin_users is
  'Internal staff only (docs/roles-permissions.md). MFA is mandatory for every '
  'role here (docs/roles-permissions.md §5) — mfa_enabled is a read model of '
  'Supabase Auth''s own MFA factor state, kept in sync by the app, not the '
  'source of truth for whether a login is allowed (that check re-reads '
  'auth.mfa.listFactors at login time).';

alter table admin_users enable row level security;

-- Helper functions used by every other table's RLS policies below. SECURITY
-- DEFINER + a pinned search_path so they can read admin_users regardless of
-- the calling context's own RLS grants, without being hijackable via a
-- search_path attack (the standard Supabase pattern for RLS role lookups).

create or replace function staff_role()
returns admin_role
language sql
security definer
stable
set search_path = public
as $$
  select role from admin_users where id = auth.uid() and status = 'active';
$$;

create or replace function is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from admin_users where id = auth.uid() and status = 'active');
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select staff_role() = 'admin';
$$;

create or replace function is_account_manager()
returns boolean
language sql
stable
as $$
  select staff_role() = 'account_manager';
$$;

create or replace function is_finance()
returns boolean
language sql
stable
as $$
  select staff_role() = 'finance';
$$;

-- Admin: full read/write. Nobody else gets a general SELECT/UPDATE here —
-- Account Manager and Finance must never touch role/status columns
-- (docs/roles-permissions.md §2: "not admin_users role/status columns"), and
-- the simplest way to guarantee that is to grant them no access to this table
-- at all rather than trying to carve out column-level exceptions with RLS
-- (RLS is row-level, not column-level — see the finance-facing views in
-- 0010_finance_views.sql for how column limits are actually enforced).
create policy admin_users_admin_all on admin_users
  for all
  using (is_admin())
  with check (is_admin());

-- Every staff member can read their own row (needed for the staff console to
-- show "you're logged in as ___" and for mfa_enabled checks) without needing
-- the Admin-only policy above.
create policy admin_users_self_select on admin_users
  for select
  using (id = auth.uid());
