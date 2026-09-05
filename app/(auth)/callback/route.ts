import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Google OAuth redirect target (docs/build-phases.md Phase 0 "email/password
// + Google OAuth"). Exchanges the auth code for a session, then tags
// first-time OAuth sign-ins with user_type the same way email/password
// sign-up does (app/(auth)/signup/page.tsx) — Google sign-in never goes
// through that form, so nothing else sets this metadata.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user && !data.user.user_metadata?.user_type) {
      await supabase.auth.updateUser({ data: { user_type: 'applicant' } });
    }

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
}
