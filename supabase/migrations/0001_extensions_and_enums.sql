-- Certified — schema per docs/blueprint.md §4, RLS per docs/roles-permissions.md §2.
-- Extensions + enum types shared across the rest of the migrations.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- Organization.type (docs/blueprint.md §4)
create type organization_type as enum ('business', 'individual');

-- Organization.status / Application.status (docs/blueprint.md §3.1, §4)
create type application_status as enum ('pending', 'more_info_requested', 'approved', 'rejected');

-- Organization.status has one extra value beyond Application.status: an
-- already-approved org can later be suspended, which never applies to a
-- standalone Application record.
create type organization_status as enum ('pending', 'more_info_requested', 'approved', 'rejected', 'suspended');

-- Trainee.contact_visibility (docs/blueprint.md §4, CLAUDE.md rule #5)
create type contact_visibility as enum ('public', 'gated', 'hidden');

-- Certificate.status (docs/blueprint.md §4)
create type certificate_status as enum ('active', 'revoked', 'expired');

-- AdminUser.role (docs/blueprint.md §4, docs/roles-permissions.md §1-2)
create type admin_role as enum ('admin', 'account_manager', 'finance');

-- AdminUser.status (docs/blueprint.md §4)
create type admin_status as enum ('active', 'suspended');
