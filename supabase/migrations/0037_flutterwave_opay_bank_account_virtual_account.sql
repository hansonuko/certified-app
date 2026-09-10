-- Follow-up to 0036: Flutterwave v4 direct charges now also support opay
-- and bank_account (lib/payments/flutterwave.ts), and a genuinely separate
-- flow, dynamically generated virtual accounts for bank transfer
-- (lib/payments/flutterwave-virtual-accounts.ts), gets its own
-- 'virtual_account' tag so it can be told apart from the others during
-- support/reconciliation — same reasoning 0036 already gave for this
-- column existing at all.
--
-- Postgres can't ALTER an existing CHECK constraint in place — drop and
-- recreate it with the wider list (0036's own note on view/function
-- replacement doesn't apply to constraints, but the same "can't just widen
-- in place" shape does).

alter table payments drop constraint payments_payment_method_check;

alter table payments add constraint payments_payment_method_check
  check (payment_method is null or payment_method in ('card', 'mobile_money', 'ussd', 'bank_transfer', 'opay', 'bank_account', 'virtual_account'));
