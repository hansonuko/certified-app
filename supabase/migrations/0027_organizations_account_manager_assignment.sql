-- Account Manager "territory" model: every organization is assigned to
-- exactly one Account Manager at creation (round-robin among active AMs,
-- lib/staff/assign-account-manager.ts), and from then on that AM — plus
-- Admin, always unrestricted — is the one who can see and act on it. This
-- replaces the previous "every Account Manager sees every organization"
-- policy with a scoped one.
--
-- Deliberately NOT extended to certificates/trainees or /staff/analytics:
-- those stay platform-wide for every Account Manager, unchanged from
-- today (docs/roles-permissions.md §2's view_certificates/
-- view_operational_analytics rows, and the RLS policies backing them,
-- aren't touched by this migration). This migration only narrows
-- `organizations` and `applications` — the two tables the assignment
-- itself is actually about.

alter table organizations add column assigned_account_manager_id uuid references admin_users (id);

comment on column organizations.assigned_account_manager_id is
  'The Account Manager who owns this organization''s day-to-day handling '
  '(application review through ongoing account management) — set once at '
  'creation by lib/staff/assign-account-manager.ts, reassignable by Admin '
  'via app/staff/(console)/organizations/[id]. Null means unassigned (e.g. '
  'no active Account Manager existed at creation time) — Admin still sees '
  'and can act on it either way; only Account Manager visibility depends '
  'on this column.';

-- Account Manager: only organizations assigned to them. Admin: unrestricted,
-- same as before this migration.
alter policy organizations_staff_all on organizations
  using (is_admin() or (is_account_manager() and assigned_account_manager_id = auth.uid()))
  with check (is_admin() or (is_account_manager() and assigned_account_manager_id = auth.uid()));

-- Applications inherit the same restriction via their org's assignment —
-- an Account Manager who can't see an organization shouldn't be able to
-- review or decide its application either, which the previous
-- unconditional is_account_manager() policy would otherwise still allow.
alter policy applications_staff_all on applications
  using (
    is_admin()
    or (
      is_account_manager()
      and exists (
        select 1 from organizations o
        where o.id = applications.org_id and o.assigned_account_manager_id = auth.uid()
      )
    )
  )
  with check (
    is_admin()
    or (
      is_account_manager()
      and exists (
        select 1 from organizations o
        where o.id = applications.org_id and o.assigned_account_manager_id = auth.uid()
      )
    )
  );
