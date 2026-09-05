/**
 * One-time first-Admin creation (docs/roles-permissions.md §4, CLAUDE.md
 * rule #10). CLI script, not a web route, by design — a script run once
 * against production has a much smaller attack surface than a permanently
 * deployed URL.
 *
 * Usage:
 *   npm run bootstrap:admin -- --name "Jane Doe" --email jane@example.com --password "Temp-Passw0rd!" --secret "<ADMIN_BOOTSTRAP_SECRET value>"
 *
 * Requires ADMIN_BOOTSTRAP_SECRET, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SERVICE_ROLE_KEY to already be set in the environment (the npm
 * script loads .env.local via Node's --env-file flag).
 *
 * After this succeeds: remove or rotate ADMIN_BOOTSTRAP_SECRET (docs/roles-
 * permissions.md §4 step 3) — the zero-count check means a leaked old
 * secret is harmless once an Admin exists, but rotating it is good hygiene
 * anyway. Every further staff account is created through /staff/team by an
 * existing Admin, never through this script again.
 *
 * Every early-exit path below sets process.exitCode and returns rather than
 * calling process.exit() directly — calling process.exit() while the
 * Supabase client still has an open handle (e.g. right after the very first
 * network call) can crash Node with a native libuv assertion on Windows
 * ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)") instead of
 * exiting cleanly. Letting main() return and the event loop drain
 * naturally avoids that.
 */
import { createAdminClient } from '../lib/supabase/admin';
import { assertBootstrapAllowed, BootstrapRefusedError } from './bootstrap-admin-guard';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { name, email, password, secret } = args;

  if (!name || !email || !password) {
    console.error('Usage: npm run bootstrap:admin -- --name "Jane Doe" --email jane@example.com --password "..." --secret "..."');
    process.exitCode = 1;
    return;
  }

  const supabase = createAdminClient();

  // Service role bypasses RLS — this is the one script allowed to read
  // admin_users before any Admin (and therefore any authenticated staff
  // session) exists to read it themselves.
  const { count, error: countError } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Failed to check admin_users count:', countError.message);
    process.exitCode = 1;
    return;
  }

  try {
    assertBootstrapAllowed({
      adminCount: count ?? 0,
      providedSecret: secret,
      expectedSecret: process.env.ADMIN_BOOTSTRAP_SECRET,
    });
  } catch (err) {
    if (err instanceof BootstrapRefusedError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff', full_name: name },
  });

  if (authError || !authUser.user) {
    console.error('Failed to create the Supabase Auth user:', authError?.message);
    process.exitCode = 1;
    return;
  }

  const { error: insertError } = await supabase.from('admin_users').insert({
    id: authUser.user.id,
    name,
    email,
    role: 'admin',
    status: 'active',
  });

  if (insertError) {
    // Don't leave a dangling Auth user with no admin_users row behind.
    console.error('Failed to insert admin_users row, rolling back the Auth user:', insertError.message);
    await supabase.auth.admin.deleteUser(authUser.user.id);
    process.exitCode = 1;
    return;
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    actor_id: null,
    actor_type: 'system',
    action: 'bootstrap_admin_created',
    target_type: 'admin_users',
    target_id: authUser.user.id,
    before: null,
    after: { name, email, role: 'admin', status: 'active' },
  });

  if (auditError) {
    // The Admin account itself is already created and usable at this point
    // — don't roll that back over an audit-log write failure, just surface
    // it loudly so it can be fixed by hand (CLAUDE.md rule #7 still wants
    // this row to exist).
    console.error('Admin created, but failed to write the AuditLog row:', auditError.message);
  }

  console.log(`First Admin created: ${email} (id: ${authUser.user.id})`);
  console.log('Next: remove or rotate ADMIN_BOOTSTRAP_SECRET now that an Admin exists (docs/roles-permissions.md §4).');
}

main();
