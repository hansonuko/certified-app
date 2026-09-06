import { NextResponse } from 'next/server';
import { createAltchaChallenge } from '@/lib/altcha/server';

// Fetched by the <altcha-widget challenge="/api/altcha-challenge"> element
// on the application form (app/(auth)/apply). A fresh challenge per request
// — never cache this route.
export async function GET() {
  const challenge = await createAltchaChallenge();
  return NextResponse.json(challenge);
}
