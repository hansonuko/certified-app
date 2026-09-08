-- /staff/finance/wallets (Monetization Flow A follow-up) needs each org's
-- certificate_credits balance, readable by both Admin and Finance from
-- their own session — organizations_finance_view already exists for
-- exactly this "Finance can't read the base organizations table directly
-- (organizations_staff_all is admin+account_manager only), so give it a
-- column-limited view instead" reason (0009's own header comment).
--
-- Appended at the end of the select list, not inserted — CREATE OR REPLACE
-- VIEW only allows appending (0025's header comment has the full story on
-- why; this is the same rule, not a new one).
create or replace view organizations_finance_view as
select
  o.id,
  o.display_name as name,
  o.plan,
  o.status,
  (select count(*) from certificates c where c.org_id = o.id) as certificates_issued,
  o.created_at,
  o.certificate_credits
from organizations o
where is_finance() or is_admin();
