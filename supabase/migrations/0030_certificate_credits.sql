-- Monetization Flow A (docs/build-phases.md Phase 11, item 1): prepaid
-- certificate credits. An organization tops up a wallet via Flutterwave/
-- Paystack; each certificate issued (single-entry or bulk) spends exactly
-- one credit. Chosen over a pay-per-transaction checkout specifically
-- because bulk issuance (Phase 7) can issue hundreds of certificates in one
-- job — a provider-hosted checkout redirect per certificate is unworkable
-- there, so the checkout only ever happens at top-up time, and issuance
-- itself becomes a cheap, atomic balance check.
--
-- CLAUDE.md's new non-negotiable rule (added alongside this migration):
-- organization registration/KYC/approval stay free forever — this migration
-- never touches that path. Nothing here changes `organizations.status` or
-- how an org becomes `approved`; certificate_credits only gates *issuance*,
-- a capability that's already unreachable pre-approval per rule #1.

alter table organizations add column certificate_credits integer not null default 0;

comment on column organizations.certificate_credits is
  'Prepaid certificate-issuance balance (Monetization Flow A). Mutated only '
  'via spend_certificate_credit()/refund_certificate_credit()/'
  'add_certificate_credits() below — never a direct client or owner write, '
  'same "one privileged path" reasoning as certificates/jobs.';

-- Extend the existing owner-write guard (0003, hardened in 0028) — an
-- issuer's own organizations_owner_all policy is still a blanket `for all`,
-- so without this an org could credit itself for free via a direct API
-- call. Same lesson 0028's own header comment calls out explicitly: check
-- every new organizations column against this trigger, don't wait to find
-- the gap the way #37 did.
create or replace function guard_organization_status_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_staff() then
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

-- certificate_credit_transactions: the ledger. organizations.certificate_
-- credits is a cached running balance (fast read on the issuance hot path);
-- this table is the source of truth / audit trail behind it. No RLS policy
-- grants INSERT/UPDATE/DELETE to anyone — every write happens inside the
-- SECURITY DEFINER functions below, which run as the functions' owner and
-- so bypass RLS the same way a service-role client does (same pattern as
-- verify_certificate()).
create table certificate_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  type text not null check (type in ('purchase', 'issuance_spend', 'refund', 'manual_adjustment')),
  quantity integer not null, -- positive for purchase/refund/manual credit, negative for spend
  unit_price numeric(12, 2),
  discount_percent numeric(5, 2),
  total_amount numeric(12, 2),
  currency text,
  payment_id uuid, -- fk added below, after the payments table exists
  balance_after integer not null,
  note text, -- e.g. refund reason, or a staff manual-adjustment note
  created_by uuid references admin_users (id), -- staff actor for manual_adjustment only; null otherwise
  created_at timestamptz not null default now()
);

create index certificate_credit_transactions_org_id_idx on certificate_credit_transactions (org_id);

alter table certificate_credit_transactions enable row level security;

create policy certificate_credit_transactions_owner_select on certificate_credit_transactions
  for select
  using (org_id in (select id from organizations where owner_user_id = auth.uid()));

create policy certificate_credit_transactions_staff_select on certificate_credit_transactions
  for select
  using (is_admin() or is_account_manager() or is_finance());

comment on table certificate_credit_transactions is
  'Ledger behind organizations.certificate_credits — every top-up, spend, '
  'refund, and staff manual adjustment. No write RLS policy for anyone; all '
  'writes go through spend_certificate_credit()/refund_certificate_credit()/'
  'add_certificate_credits(), same "no direct write path" pattern as '
  'certificates/audit_log/jobs (docs/session-handoff.md §5).';

-- payments: one row per checkout attempt, provider-agnostic (purpose is
-- 'certificate_credits' only for now — Flows B/C, if/when built, extend
-- this check rather than adding a second table). The owner creates their
-- own row at checkout-initiation time (so there's a reference to reconcile
-- the webhook against); only the service-role webhook handler ever
-- transitions it out of 'pending'.
create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations (id) on delete cascade,
  purpose text not null check (purpose in ('certificate_credits')),
  provider text not null check (provider in ('flutterwave', 'paystack')),
  provider_reference text not null unique,
  quantity integer, -- credit-pack quantity for purpose = 'certificate_credits'
  unit_price numeric(12, 2),
  discount_percent numeric(5, 2),
  amount numeric(12, 2) not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index payments_org_id_idx on payments (org_id);
create index payments_provider_reference_idx on payments (provider_reference);

alter table certificate_credit_transactions
  add constraint certificate_credit_transactions_payment_id_fkey
  foreign key (payment_id) references payments (id) on delete set null;

alter table payments enable row level security;

-- Owner creates their own org's pending checkout row, and can read it (e.g.
-- the billing callback page polling for a result) — no update/delete
-- policy, so an owner can never mark their own payment 'success' directly.
create policy payments_owner_insert on payments
  for insert
  with check (
    status = 'pending'
    and org_id in (select id from organizations where owner_user_id = auth.uid())
  );

create policy payments_owner_select on payments
  for select
  using (org_id in (select id from organizations where owner_user_id = auth.uid()));

create policy payments_staff_select on payments
  for select
  using (is_admin() or is_finance());

comment on table payments is
  'One row per checkout attempt (Monetization Flow A; extensible to future '
  'flows via `purpose`). Status only ever transitions pending -> success|'
  'failed from the service-role webhook handler (lib/payments/confirm.ts) '
  'or its page-view fallback verify — never from the owner''s own session, '
  'same reasoning as jobs/certificates.';

-- certificate_credit_pricing_tiers: the tiered volume discount, admin/
-- finance-editable at any time without a redeploy (the user-requested
-- capability this migration is specifically built to support) — matches
-- `manage_billing`'s existing scope in lib/permissions.ts / docs/roles-
-- permissions.md §2 ("plan/pricing config (post-monetization)"), which
-- named exactly this before monetization had shipped anything to configure.
-- Quantity breakpoints (1 / 2-19 / 20+) are the agreed v1 shape; only the
-- discount percentages are expected to change often, but nothing below
-- stops Admin/Finance from adding or editing a row's bounds too.
create table certificate_credit_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  min_quantity integer not null,
  max_quantity integer, -- null = open-ended (the top tier)
  discount_percent numeric(5, 2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users (id)
);

insert into certificate_credit_pricing_tiers (min_quantity, max_quantity, discount_percent) values
  (1, 1, 0),    -- pay-as-you-go: no discount
  (2, 19, 30),  -- ₦700/credit
  (20, null, 50); -- ₦500/credit — 20 credits = ₦10,000

alter table certificate_credit_pricing_tiers enable row level security;

-- Public read (the billing page, and eventually /pricing, both need to show
-- current pricing before a purchase) — no PII, no reason to gate this.
create policy certificate_credit_pricing_tiers_select on certificate_credit_pricing_tiers
  for select
  using (true);

create policy certificate_credit_pricing_tiers_staff_write on certificate_credit_pricing_tiers
  for all
  using (is_admin() or is_finance())
  with check (is_admin() or is_finance());

-- payment_currency_rates: the "or its equivalent amount for other African
-- countries" table. NGN is the anchor (rate 1); every other currency stores
-- how many units of that currency equal ₦1 (multiply an NGN price by this
-- to get the local-currency price). Seeded with approximate, deliberately
-- rough placeholder rates for the four priority countries (lib/geo/
-- africa.ts) + a USD fallback for everywhere else — flagged clearly rather
-- than presented as accurate: these need Admin/Finance to verify and update
-- periodically (no live FX feed in v1, same "solve it for priority
-- countries first" shortcut already used for directory location data).
create table payment_currency_rates (
  id uuid primary key default gen_random_uuid(),
  currency text not null unique, -- ISO 4217
  ngn_rate numeric(14, 6) not null, -- units of `currency` per ₦1
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users (id)
);

insert into payment_currency_rates (currency, ngn_rate) values
  ('NGN', 1),
  ('GHS', 0.0095),   -- placeholder — verify before relying on this for a real charge
  ('KES', 0.084),    -- placeholder
  ('ZAR', 0.012),    -- placeholder
  ('USD', 0.00062);  -- placeholder, used as the fallback for every non-priority country

alter table payment_currency_rates enable row level security;

create policy payment_currency_rates_select on payment_currency_rates
  for select
  using (true);

create policy payment_currency_rates_staff_write on payment_currency_rates
  for all
  using (is_admin() or is_finance())
  with check (is_admin() or is_finance());

-- The three privileged functions. All SECURITY DEFINER so they run as the
-- migration owner (bypasses RLS on the tables above, same effect as a
-- service-role client) — callable via supabase-js `.rpc()` from server-only
-- code (lib/payments/credits.ts), never from a client component.

-- Atomic check-and-decrement: a single `update ... where certificate_credits
-- >= 1` avoids the read-then-write race a bulk job could hit if it were
-- ever running two ticks for the same org concurrently (same concern
-- jobs.processing_lock_expires_at was built for in 0022, different
-- mechanism because this needs to be safe per-row, not per-job).
create or replace function spend_certificate_credit(p_org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  update organizations
  set certificate_credits = certificate_credits - 1
  where id = p_org_id and certificate_credits >= 1
  returning certificate_credits into v_new_balance;

  if v_new_balance is null then
    return false;
  end if;

  insert into certificate_credit_transactions (org_id, type, quantity, balance_after)
  values (p_org_id, 'issuance_spend', -1, v_new_balance);

  return true;
end;
$$;

-- Called by lib/certificates/issue.tsx when a spent credit's certificate
-- ultimately fails to generate (a hard DB error, or a render/upload
-- exception) — an issuer should never lose a credit for a certificate that
-- was never actually issued. Not used for the ordinary public_id-collision
-- retry loop, which resolves silently without needing a refund.
create or replace function refund_certificate_credit(p_org_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  update organizations
  set certificate_credits = certificate_credits + 1
  where id = p_org_id
  returning certificate_credits into v_new_balance;

  insert into certificate_credit_transactions (org_id, type, quantity, balance_after, note)
  values (p_org_id, 'refund', 1, v_new_balance, p_reason);
end;
$$;

-- Called only from the payment-confirmation path (lib/payments/confirm.ts,
-- itself only reachable from the webhook routes / the billing callback
-- page's fallback verify) once a provider has confirmed a real payment —
-- never from anything the client can trigger directly.
create or replace function add_certificate_credits(
  p_org_id uuid,
  p_quantity integer,
  p_unit_price numeric,
  p_discount_percent numeric,
  p_total_amount numeric,
  p_currency text,
  p_payment_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  update organizations
  set certificate_credits = certificate_credits + p_quantity
  where id = p_org_id
  returning certificate_credits into v_new_balance;

  insert into certificate_credit_transactions
    (org_id, type, quantity, unit_price, discount_percent, total_amount, currency, payment_id, balance_after)
  values
    (p_org_id, 'purchase', p_quantity, p_unit_price, p_discount_percent, p_total_amount, p_currency, p_payment_id, v_new_balance);

  return v_new_balance;
end;
$$;
