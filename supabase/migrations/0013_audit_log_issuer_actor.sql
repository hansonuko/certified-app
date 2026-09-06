-- Phase 4 schema changes, part 2 of 4 (docs/build-phases.md Phase 4) —
-- audit_log support for issuer-initiated actions. Split out into its own
-- migration file for the same deadlock-avoidance reason as 0012's header
-- comment explains: keeping each file's transaction scoped to one table
-- avoids racing Supabase's background processes for locks across multiple
-- relations in the opposite order.
--
-- CLAUDE.md rule #7 says every admin *decision* is audit-logged; the issuer
-- dashboard's certificate revocation (docs/build-phases.md Phase 4) is a
-- distinct, narrower thing — an issuer correcting their own org's own
-- issuance, not a staff moderation decision (docs/roles-permissions.md §2's
-- "Revoke a certificate" row is about which *staff* roles can revoke, and
-- doesn't speak to an issuer's own corrections at all). It still deserves
-- the same "no decision path skips the audit trail" discipline, so audit_log
-- gains a third actor_type rather than a parallel table.
--
-- actor_id (references admin_users) can't represent an issuer — an issuer's
-- auth.uid() has no admin_users row. actor_user_id is the general-purpose
-- column for that: populated for actor_type = 'issuer', left null for
-- 'staff'/'system' (which keep using actor_id, unchanged).
alter table audit_log add column actor_user_id uuid references auth.users (id) on delete set null;

alter table audit_log drop constraint audit_log_actor_type_check;
alter table audit_log add constraint audit_log_actor_type_check
  check (actor_type in ('system', 'staff', 'issuer'));

comment on column audit_log.actor_user_id is
  'Set for actor_type = ''issuer'' (an org owner acting on their own data, '
  'e.g. certificate revocation) — actor_id/admin_users has no row for a '
  'non-staff auth user. Staff/system rows keep using actor_id as before.';
