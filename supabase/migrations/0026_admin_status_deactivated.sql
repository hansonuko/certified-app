-- /staff/team: a permanent "Deactivate" action, distinct from Suspend
-- (reversible via Reinstate) and from actually deleting the admin_users
-- row (which would either violate audit_log.actor_id's foreign key on
-- any row where this staff member was ever the actor, or silently erase
-- who did what — neither acceptable given CLAUDE.md rule #7). "Deactivated"
-- has no reinstate path in the UI (app/staff/(console)/team/actions.ts) —
-- it's a one-way door, unlike suspend.

alter type admin_status add value 'deactivated';

comment on type admin_status is
  'active: normal login. suspended: temporarily blocked, reversible via '
  'reinstate. deactivated: permanently blocked, no reinstate path — added '
  'so an Admin can definitively close out a departed staff member''s '
  'access without deleting the admin_users row (which audit_log.actor_id '
  'references and which would erase their name from the audit trail).';
