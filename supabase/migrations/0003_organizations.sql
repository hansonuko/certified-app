-- Organization (docs/blueprint.md §4). Two deliberate deviations from the
-- blueprint's shorthand notation, both called out here rather than applied
-- silently:
--
-- 1. `owner_user_id` is a new column, not listed in blueprint §4's `owner: {}`
--    sub-object. The blueprint lists owner *profile* fields (name, phone,
--    email, KYC docs) but never says which auth.users row can manage the
--    org — without that link, "applicants can only read/write their own
--    Organization" (docs/roles-permissions.md §2) has nothing for an RLS
--    policy to check against. This column is that link.
-- 2. `brand`, `address`, and `owner` are denormalized into individual
--    columns instead of the blueprint's nested-object shorthand. Finance
--    must see organizations but never KYC fields (id_document_url, nin) or
--    raw contact fields (docs/roles-permissions.md §2) — RLS is row-level,
--    not column-level, so column-limited access has to be a view
--    (organizations_finance_view, 0009_public_and_finance_views.sql)
--    selecting a safe column list. That's far simpler and harder to get
--    wrong with real columns than with jsonb key-picking out of one blob.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  type organization_type not null,
  legal_name text not null,
  display_name text not null,
  rc_number text not null, -- RC number (business) or NIN (individual trainer) — uniqueness enforced below
  status organization_status not null default 'pending',

  -- brand (docs/blueprint.md §4 `brand: {}`) — consumed as BrandConfig,
  -- lib/certificates/types.ts. Never touches the mandatory gold seal
  -- (CLAUDE.md rule #2); primary_color only drives each template's own
  -- accent geometry.
  brand_logo_url text,
  brand_primary_color text,
  brand_template_id text, -- one of lib/certificates/templates/index.ts's keys
  brand_signatory_name text,
  brand_signatory_title text,
  brand_signature_image_url text,

  -- address (docs/blueprint.md §4 `address: {}`) — state/lga are shown on the
  -- public directory; street is intentionally never selected by any
  -- anon-facing view.
  address_state text,
  address_lga text,
  address_street text,

  -- owner (docs/blueprint.md §4 `owner: {}`) — id_document_url and nin are
  -- KYC fields: Account Manager and Admin only (docs/roles-permissions.md
  -- §2), never Finance, never anon. declaration_signed_at is populated only
  -- for individual trainers (docs/declaration-form.md).
  owner_full_name text not null,
  owner_phone text not null,
  owner_email text not null,
  owner_id_document_url text,
  owner_nin text,
  owner_declaration_signed_at timestamptz,

  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references admin_users (id),

  constraint organizations_rc_number_unique unique (rc_number)
);

comment on table organizations is
  'Issuer accounts (docs/blueprint.md §4). status must be approved before any '
  'certificate-issuance code path is reachable (CLAUDE.md rule #1) — that gate '
  'lives in application code, this table only records the status.';

alter table organizations enable row level security;

-- Applicant/issuer: read + write only their own organization
-- (docs/roles-permissions.md §2).
create policy organizations_owner_all on organizations
  for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Admin + Account Manager: full read/write on the base table (both are
-- allowed to see KYC fields per the matrix). Finance is deliberately NOT
-- granted here — see organizations_finance_view instead.
create policy organizations_staff_all on organizations
  for all
  using (is_admin() or is_account_manager())
  with check (is_admin() or is_account_manager());

-- Suspend/reinstate is a status-only transition Account Manager can also make
-- (docs/roles-permissions.md §2: "Suspend / reinstate an organization ✅
-- Account Manager (with reason, audit-logged)") — already covered by the
-- staff_all policy above; the audit-log write is enforced in application
-- code (every admin decision writes an AuditLog row, CLAUDE.md rule #7), not
-- something a table constraint can express.

-- No direct anon policy on this base table — anon/public access to approved
-- issuers' display info goes through organizations_public_view
-- (0009_public_and_finance_views.sql), never this table, so owner_* and
-- address_street columns can never leak regardless of what a client requests.

-- RLS alone isn't enough to enforce CLAUDE.md rule #1 ("no issuance without
-- approval"): organizations_owner_all above lets an applicant UPDATE their own
-- row, and RLS's `using`/`with check` clauses can't cheaply express "this
-- specific column may only change if the caller is staff." Without this
-- trigger, an applicant could set status = 'approved' on their own
-- organization directly through the Supabase client and self-approve.
create or replace function guard_organization_status_columns()
returns trigger
language plpgsql
as $$
begin
  if not is_staff() then
    if new.status is distinct from old.status
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by then
      raise exception 'status, approved_at, and approved_by can only be changed by staff';
    end if;
  end if;
  return new;
end;
$$;

create trigger organizations_guard_status_columns
  before update on organizations
  for each row
  execute function guard_organization_status_columns();
