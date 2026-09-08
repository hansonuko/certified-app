-- Bug fix, found via live diagnostic testing (user report: "admin can't
-- fund org", and separately, real Paystack payments never landing
-- credits): guard_organization_status_columns() (0003, extended in 0028
-- and 0030) blocks any non-staff change to certificate_credits (and
-- assigned_account_manager_id/status/approved_at/approved_by) — but its
-- own `is_staff()` check is `exists (select 1 from admin_users where id =
-- auth.uid() and status = 'active')`, and auth.uid() reads the current
-- request's JWT 'sub' claim. A service-role-authenticated call (exactly
-- how every one of spend_certificate_credit()/refund_certificate_credit()/
-- add_certificate_credits()/adjust_certificate_credits_manual() is invoked
-- — lib/payments/credits.ts always calls them via the service-role client,
-- never a staff session) carries no user JWT at all, so auth.uid() is
-- null and is_staff() is unconditionally false in that context. SECURITY
-- DEFINER on those functions changes nothing here — it affects which role
-- evaluates RLS/table ownership, not what auth.uid()/is_staff() return,
-- which are purely a function of the request's JWT.
--
-- End result, confirmed live with a disposable test org and the real RPC
-- call: every one of those four functions' own UPDATE on organizations
-- has been raising this trigger's exception since migration 0030 shipped
-- — 0030's own error message text ("...can only be changed by staff OR
-- THE SERVICE-ROLE CREDIT FUNCTIONS") describes an exemption that was
-- never actually implemented. Certificate issuance's credit spend,
-- payment-confirmation's credit top-up, refunds, and staff's manual wallet
-- adjustment have all been silently failing (spend/add swallow the RPC
-- error and return false/null, per lib/payments/credits.ts's own
-- console.error-and-degrade design) rather than throwing somewhere
-- visible, which is why this went unnoticed until a manual adjustment's
-- error surfaced directly in the UI.
--
-- Fix: also allow the change through when the caller is the service role
-- (auth.role() reads the JWT's own 'role' claim — 'service_role' for the
-- service-role key, 'authenticated'/'anon' for every other caller this
-- trigger is meant to keep blocking). This doesn't weaken the trigger's
-- actual purpose (stopping an *owner's own authenticated session* from
-- self-editing these columns via organizations_owner_all's blanket `for
-- all` policy, CLAUDE.md rule #1/#12) — the service-role client already
-- bypasses RLS entirely everywhere else in this schema (certificates,
-- audit_log, jobs all follow the same "no direct write policy for anyone,
-- service-role client only" pattern with no equivalent trigger blocking
-- it) — this just makes the trigger consistent with that same trust
-- model instead of accidentally being the one place that trusts an
-- authenticated staff session but not the service role.

create or replace function guard_organization_status_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_staff() and coalesce(auth.role(), '') <> 'service_role' then
    if new.status is distinct from old.status
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by
      or new.assigned_account_manager_id is distinct from old.assigned_account_manager_id
      or new.certificate_credits is distinct from old.certificate_credits then
      raise exception 'status, approved_at, approved_by, assigned_account_manager_id, and certificate_credits can only be changed by staff or the service-role credit functions';
    end if;
  end if;
  return new;
end;
$$;

-- The trigger itself (organizations_guard_status_columns, 0003) already
-- points at this function by name — replacing the function body is
-- enough, no trigger changes needed.
