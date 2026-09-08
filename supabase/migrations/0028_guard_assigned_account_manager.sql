-- Security fix: organizations_owner_all (0003_organizations.sql) is a
-- blanket `for all using/with check (owner_user_id = auth.uid())` policy —
-- an issuer's own session can update ANY column on their own org row,
-- not just the ones a dashboard form exposes. guard_organization_status_
-- columns() (0003) already blocks non-staff from touching status/
-- approved_at/approved_by for exactly this reason; assigned_account_
-- manager_id (added in 0027, after that trigger was written) was missed
-- and needs the same protection — an issuer could otherwise reassign
-- their own org to a different Account Manager (or clear the assignment
-- entirely) via a direct API call, bypassing reassign_organization_
-- account_manager's Admin-only gate (lib/permissions.ts) entirely, since
-- RLS never checked it in the first place.
--
-- Scoped to just this one column per discussion — rc_number/legal_name/
-- plan being similarly owner-writable post-approval is a separate,
-- pre-existing gap (predates this session's own changes), not fixed here.

create or replace function guard_organization_status_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_staff() then
    if new.status is distinct from old.status
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by
      or new.assigned_account_manager_id is distinct from old.assigned_account_manager_id then
      raise exception 'status, approved_at, approved_by, and assigned_account_manager_id can only be changed by staff';
    end if;
  end if;
  return new;
end;
$$;

-- The trigger itself (organizations_guard_status_columns, 0003) already
-- points at this function by name — replacing the function body is
-- enough, no trigger changes needed.
