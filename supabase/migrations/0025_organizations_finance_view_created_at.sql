-- /staff/finance/reports (docs/build-phases.md Phase 9, item 2) needs a
-- time dimension to show "org growth" as a trend rather than a single
-- snapshot count — organizations_finance_view (0009_public_and_finance_
-- views.sql) didn't carry one when it was first built (Phase 0, before
-- Phase 9's reports requirement was concrete). created_at isn't a KYC or
-- contact field (docs/roles-permissions.md §2's exclusion list is
-- owner_id_document_url/owner_nin/owner_phone/owner_email), so adding it
-- here doesn't change what Finance is allowed to see, just what this one
-- view exposes of what's already allowed.

create or replace view organizations_finance_view as
select
  o.id,
  o.display_name as name,
  o.plan,
  o.status,
  o.created_at,
  (select count(*) from certificates c where c.org_id = o.id) as certificates_issued
from organizations o
where is_finance() or is_admin();

-- The view's owner/grant/self-filter setup (see 0009's file header for why
-- this is a plain, non-security-invoker view) is unchanged by `create or
-- replace` — only the column list changed.
