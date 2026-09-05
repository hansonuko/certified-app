import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * The /dashboard/* gate — the other half of "issuer and staff sessions never
 * cross over" (docs/build-phases.md Phase 0). A staff account signing in at
 * /login (same underlying Supabase Auth project, so nothing stops them
 * technically trying) still gets redirected away from the issuer dashboard,
 * because their uid has a row in admin_users. Staff use /staff, never
 * /dashboard, even though they could authenticate at either URL.
 */
export async function requireIssuerSession(): Promise<{ userId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (adminUser) redirect('/staff');

  return { userId: user.id };
}
