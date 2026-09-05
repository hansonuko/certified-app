/**
 * The actual gate for scripts/bootstrap-admin.ts, split out as pure logic so
 * it's testable without a live Supabase project (docs/build-phases.md Phase
 * 0.5: "write a test that confirms this"). No I/O here — bootstrap-admin.ts
 * does the DB count + Supabase Auth/admin_users/audit_log work and calls
 * this first.
 *
 * docs/roles-permissions.md §4: "Checks SELECT count(*) FROM admin_users —
 * if the count is anything other than zero, it refuses immediately,
 * regardless of whether the correct secret was supplied. This check, not
 * the secret, is the real gate." CLAUDE.md rule #10 says the same thing:
 * this path only ever runs once, unconditionally, no exceptions "for
 * testing."
 */
export class BootstrapRefusedError extends Error {}

export function assertBootstrapAllowed({
  adminCount,
  providedSecret,
  expectedSecret,
}: {
  adminCount: number;
  providedSecret: string | undefined;
  expectedSecret: string | undefined;
}): void {
  // The count check comes first and is checked independently of the secret
  // — an admin_users row already existing refuses the run even if the
  // correct secret was supplied (docs/roles-permissions.md §4, CLAUDE.md
  // rule #10). Never reorder this after the secret check "to fail fast" —
  // the ordering is the point: the count is the real gate, the secret is
  // secondary.
  if (adminCount !== 0) {
    throw new BootstrapRefusedError(
      `Refusing: admin_users already has ${adminCount} row(s). The bootstrap path only ever runs once — ` +
        'further staff accounts are created through /staff/team by an existing Admin, never through this script again.',
    );
  }

  if (!expectedSecret) {
    throw new BootstrapRefusedError(
      'Refusing: ADMIN_BOOTSTRAP_SECRET is not set in the environment. Generate one with `openssl rand -hex 32` and set it before running this script.',
    );
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    throw new BootstrapRefusedError('Refusing: --secret does not match ADMIN_BOOTSTRAP_SECRET.');
  }
}
