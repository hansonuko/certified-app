-- Flutterwave v4 support (Monetization Flow A follow-up, docs/session-
-- handoff.md §20). v4's status lookup is GET /charges/{id} using
-- Flutterwave's own internal charge id (e.g. "chg_xxx") — unlike v3/
-- Paystack, there is no "verify by our own reference" endpoint, so the
-- charge id has to be stored at charge-creation time to look the payment
-- back up on the billing callback / webhook path.

alter table payments add column provider_charge_id text;

comment on column payments.provider_charge_id is
  'Flutterwave v4 charge id ("chg_...") — set right after POST /orchestration/'
  'direct-charges succeeds, used by GET /charges/{id} to confirm the result. '
  'Null for Paystack payments (verified by provider_reference instead).';
