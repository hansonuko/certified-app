-- /staff/finance/reports (docs/build-phases.md Phase 9, item 2) needs a
-- time dimension to show "org growth" as a trend rather than a single
-- snapshot count — organizations_finance_view (0009_public_and_finance_
-- views.sql) didn't carry one when it was first built (Phase 0, before
-- Phase 9's reports requirement was concrete). created_at isn't a KYC or
-- contact field (docs/roles-permissions.md §2's exclusion list is
-- owner_id_document_url/owner_nin/owner_phone/owner_email), so adding it
-- here doesn't change what Finance is allowed to see, just what this one
-- view exposes of what's already allowed.
--
-- created_at MUST be the last column in the select list, not inserted
-- before certificates_issued (this migration's first version put it there
-- and failed against the real hosted project with 42P16: "cannot change
-- name of view column certificates_issued to created_at" — CREATE OR
-- REPLACE VIEW only allows *appending* columns, since Postgres compares
-- the new list to the old one position-by-position; inserting a column
-- mid-list shifts every column after it and reads as a rename of
-- whatever was already at that position, exactly like 0017's comment
-- about trainees_public_view already warned for renames, just triggered
-- here by an insert instead).

create or replace view organizations_finance_view as
select
  o.id,
  o.display_name as name,
  o.plan,
  o.status,
  (select count(*) from certificates c where c.org_id = o.id) as certificates_issued,
  o.created_at
from organizations o
where is_finance() or is_admin();

-- The view's owner/grant/self-filter setup (see 0009's file header for why
-- this is a plain, non-security-invoker view) is unchanged by `create or
-- replace` — only the column list changed. Application code (lib/reports/
-- finance-data.ts, app/staff/(console)/finance/billing/page.tsx, app/staff/
-- (console)/organizations/{page.tsx,[id]/page.tsx}) all select columns by
-- name, never `select *`, so this reordering doesn't affect any of them.
