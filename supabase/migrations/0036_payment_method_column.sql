-- Multi-method Flutterwave support (follow-up to 0031's provider_charge_id
-- — docs/session-handoff.md's Flutterwave section): Flutterwave v4 charges
-- can now be card, mobile_money, ussd, or bank_transfer
-- (lib/payments/flutterwave.ts). Paystack's own hosted checkout still picks
-- up card/bank transfer/USSD entirely on its side, so this stays null for
-- Paystack payments — nothing here changes how Paystack is confirmed.
--
-- Purely additive: nothing downstream (lib/payments/confirm.ts, the
-- certificate_credit_transactions ledger, /staff/finance/wallets) reads
-- this column yet — it exists so a stuck or disputed payment can be told
-- apart by method during support/reconciliation, without needing to guess
-- from `provider` alone.

alter table payments add column payment_method text
  check (payment_method is null or payment_method in ('card', 'mobile_money', 'ussd', 'bank_transfer'));

comment on column payments.payment_method is
  'Which Flutterwave v4 payment_method.type the charge was created with '
  '(lib/payments/flutterwave.ts). Null for Paystack payments (its hosted '
  'checkout handles method choice on its own side) and for any Flutterwave '
  'payment created before this column existed.';
