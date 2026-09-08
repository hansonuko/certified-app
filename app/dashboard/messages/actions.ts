'use server';

import { revalidatePath } from 'next/cache';
import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';

export async function markMessageRead(messageId: string) {
  await requireApprovedIssuerSession(); // just needs a valid approved-issuer session; contact_requests_owner_update's own RLS check does the real per-row scoping
  const supabase = await createClient();
  await supabase.from('contact_requests').update({ read_at: new Date().toISOString() }).eq('id', messageId);
  revalidatePath('/dashboard/messages');
}
