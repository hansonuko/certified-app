-- Phase 7, item 1 (docs/build-phases.md) — CSV bulk cohort issuance,
-- queued rather than processed in one request (docs/blueprint.md §3.3B,
-- §8.3: avoids a single request trying to render dozens of certificate
-- PDFs and hitting Vercel's function execution limit). This migration only
-- adds the queue table itself; the Cron-triggered processor that actually
-- issues certificates from a job's rows is item 2 — a job sits at
-- status = 'pending' until then.
--
-- `rows`/`row_results` are jsonb rather than a normalized child table: a
-- job's rows are write-once input (validated client- and server-side
-- before insert, lib/bulk-issuance/validate.ts) and its results are a
-- processing log the issuer reads as a summary, not data anything else in
-- the schema needs to join against — certificates themselves are the real,
-- normalized record once a row succeeds (each one an ordinary row in
-- `certificates`, indistinguishable from a single-entry issuance).
create table jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  program_id uuid not null references training_programs (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed')),

  rows jsonb not null, -- BulkRow[] (lib/bulk-issuance/validate.ts), error-free rows only
  total_rows integer not null,
  processed_rows integer not null default 0,
  succeeded_rows integer not null default 0,
  failed_rows integer not null default 0,
  row_results jsonb not null default '[]'::jsonb, -- filled in by the processor (item 2) as it works through `rows`

  -- Batch-level consent, not per-row (docs/blueprint.md §6's consent
  -- checkbox is written per-trainee for single entry; for a CSV cohort the
  -- issuer instead confirms the whole batch at upload time — flagged as a
  -- real, deliberate weakening of the per-person attestation, not an
  -- oversight). Enforced not just in the app but at the DB layer too: the
  -- insert policy below refuses a row where this isn't true.
  consent_confirmed boolean not null default false,

  error text, -- job-level fatal error (e.g. brand not configured), distinct from a per-row failure
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index jobs_org_id_idx on jobs (org_id);
create index jobs_status_idx on jobs (status);

alter table jobs enable row level security;

-- Issuer: create their own org's jobs, and read status/progress. No update/
-- delete policy for the owner — every mutation past creation (status,
-- progress counters, row_results) happens from the Cron-triggered processor
-- (item 2) via the service-role client, same "one write path, not two that
-- can drift apart" reasoning as certificates/audit_log (supabase/migrations
-- 0007/0008's own file-header comments).
create policy jobs_owner_insert on jobs
  for insert
  with check (
    org_id in (select id from organizations where owner_user_id = auth.uid())
    and consent_confirmed = true
  );

create policy jobs_owner_select on jobs
  for select
  using (org_id in (select id from organizations where owner_user_id = auth.uid()));

-- Admin + Account Manager: read-only, for issuer support (same reasoning as
-- training_programs_staff_all, supabase/migrations/0005). Finance gets no
-- policy here — bulk issuance activity isn't a financial/usage surface any
-- more than single-entry issuance is.
create policy jobs_staff_select on jobs
  for select
  using (is_admin() or is_account_manager());
