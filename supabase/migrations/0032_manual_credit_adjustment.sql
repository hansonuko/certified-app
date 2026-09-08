-- Staff wallet management (Monetization Flow A follow-up, user-requested
-- "build the admin wallet properly"): certificate_credit_transactions
-- already had a `manual_adjustment` type in its check constraint since
-- 0030, but no function ever wrote one — Admin/Finance had no way to
-- correct a wallet balance (refund goodwill, fix a support-desk error)
-- without a raw SQL Editor edit. This is that function.
--
-- Same "one privileged path, no direct write" pattern as spend_
-- certificate_credit()/add_certificate_credits() — SECURITY DEFINER,
-- bypasses RLS, so the real enforcement (can(role, 'manage_billing')) lives
-- in the calling server action (app/staff/(console)/finance/wallets/
-- actions.ts), not here — this function trusts its caller the same way
-- every other credit-mutating function already does.
--
-- p_quantity can be positive (credit) or negative (debit) — a debit is
-- guarded against taking the balance below zero, same floor
-- spend_certificate_credit() already enforces for issuance spends.
create or replace function adjust_certificate_credits_manual(
  p_org_id uuid,
  p_quantity integer,
  p_note text,
  p_staff_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if p_quantity = 0 then
    raise exception 'Adjustment quantity must not be zero.';
  end if;

  update organizations
  set certificate_credits = certificate_credits + p_quantity
  where id = p_org_id and certificate_credits + p_quantity >= 0
  returning certificate_credits into v_new_balance;

  if v_new_balance is null then
    raise exception 'Adjustment would take the balance below zero.';
  end if;

  insert into certificate_credit_transactions (org_id, type, quantity, balance_after, note, created_by)
  values (p_org_id, 'manual_adjustment', p_quantity, v_new_balance, p_note, p_staff_id);

  return v_new_balance;
end;
$$;
