import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { markMessageRead } from './actions';

// /dashboard/messages (docs/sitemap.md §5: "Inbound leads — Contact/hire
// messages relayed from the public directory"). Was a ComingSoon
// placeholder because nothing was ever persisted for it to read — lib/
// contact/actions.ts's relay (Phase 6) was email-only until supabase/
// migrations/0029 added contact_requests alongside it. No in-app reply:
// replying still happens over email, same as before this page existed —
// this is a read (and mark-read) surface only.
export default async function MessagesPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from('contact_requests')
    .select('id, sender_name, sender_email, sender_phone, message, created_at, read_at')
    .eq('target_type', 'organization')
    .eq('target_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Messages</h1>
      <p className="text-certified-muted">
        Contact/hire inquiries from your public directory page. Reply directly to the sender&apos;s email — there&apos;s
        no in-app reply.
      </p>

      {!messages || messages.length === 0 ? (
        <p className="text-certified-muted">No messages yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 rounded-card border p-4 text-sm ${
                msg.read_at ? 'border-certified-border' : 'border-certified-gold bg-certified-surface-2'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-certified-ink">
                  {msg.sender_name} · <a href={`mailto:${msg.sender_email}`} className="underline">{msg.sender_email}</a>
                  {msg.sender_phone ? ` · ${msg.sender_phone}` : ''}
                </p>
                <span className="text-xs text-certified-muted">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="text-certified-ink">{msg.message}</p>
              {!msg.read_at ? (
                <form action={markMessageRead.bind(null, msg.id)}>
                  <button type="submit" className="self-start text-xs text-certified-navy underline">
                    Mark as read
                  </button>
                </form>
              ) : (
                <p className="text-xs text-certified-muted">Read {new Date(msg.read_at).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
