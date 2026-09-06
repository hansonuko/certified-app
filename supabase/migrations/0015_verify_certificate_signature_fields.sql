-- Phase 4 schema changes, part 4 of 4 (docs/build-phases.md Phase 4) —
-- verify_certificate() gains the fields the verification page needs to
-- recompute the HMAC server-side and to disclose a revocation. Split out
-- into its own migration file for the same deadlock-avoidance reason as
-- 0012's header comment explains.
--
-- The original function (0009) didn't return signature_hash, org_id,
-- revoked_reason, or revoked_at. signature_hash/org_id are needed for
-- CLAUDE.md rule #3's "recompute the signature server-side and compare"
-- (lib/certificates/sign.ts); revoked_reason/revoked_at are needed to render
-- docs/blueprint.md §6's "This certificate was revoked on [date]: [reason]"
-- disclosure — a revocation must stay permanently visible on the
-- verification page, not just flip a status badge. Exposing signature_hash
-- to anon is fine here: blueprint §6 explicitly suggests showing it as
-- on-certificate small print, and this function still only ever returns at
-- most one row for one known public_id — no enumeration path is opened by
-- adding columns to it.
--
-- `create or replace` can't change a function's OUT-parameter row shape
-- (Postgres 42P13, "cannot change return type of existing function") — the
-- column list here is a superset of 0009's original, which is still a
-- shape change, so the old version has to be dropped first. The grant is
-- re-issued below after recreating it; dropping a function drops privileges
-- granted on it too.
drop function if exists verify_certificate(text);

create function verify_certificate(p_public_id text)
returns table (
  public_id text,
  org_id uuid,
  trainee_name text,
  program_title text,
  issuer_display_name text,
  completion_date date,
  issue_date date,
  expiry_date date,
  status certificate_status,
  grade text,
  pdf_url text,
  signature_hash text,
  revoked_reason text,
  revoked_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.public_id,
    c.org_id,
    c.trainee_name_snapshot,
    c.program_title_snapshot,
    o.display_name,
    c.completion_date,
    c.issue_date,
    c.expiry_date,
    c.status,
    c.grade,
    c.pdf_url,
    c.signature_hash,
    c.revoked_reason,
    c.revoked_at
  from certificates c
  join organizations o on o.id = c.org_id
  where c.public_id = p_public_id;
$$;

grant execute on function verify_certificate(text) to anon, authenticated;
