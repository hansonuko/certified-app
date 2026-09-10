/**
 * Shared v4 API mechanics — OAuth2 token fetch/cache, the orchestrator
 * host, and the "read body as text before JSON.parse" response guard —
 * factored out of lib/payments/flutterwave.ts so lib/payments/flutterwave-
 * virtual-accounts.ts (a different pair of endpoints, `/customers` and
 * `/virtual-accounts`, not `/orchestration/*`, but the same host/auth) can
 * reuse them without a second, independently-caching copy of
 * `cachedToken`. See flutterwave.ts's own file header for the fuller
 * history of how the host/JSON-parsing issues here were caught.
 */

export const API_BASE = 'https://f4bexperience.flutterwave.com';
const TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

/**
 * `res.json()` throws an opaque "Unexpected token ... is not valid JSON"
 * SyntaxError when the server (or a proxy/gateway in front of it) returns a
 * plain-text or HTML body instead. Reads the body as text first so a
 * non-JSON response surfaces its actual content (truncated) as a clear
 * error instead of a cryptic parse failure.
 */
export async function parseJsonResponse(res: Response): Promise<{ ok: true; json: any } | { ok: false; error: string }> {
  const text = await res.text();
  try {
    return { ok: true, json: text ? JSON.parse(text) : {} };
  } catch {
    const snippet = text.slice(0, 200).trim();
    return { ok: false, error: `Flutterwave returned a non-JSON response (HTTP ${res.status}): ${snippet || '(empty body)'}` };
  }
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('FLUTTERWAVE_CLIENT_ID'),
      client_secret: requireEnv('FLUTTERWAVE_CLIENT_SECRET'),
      grant_type: 'client_credentials',
    }),
  });
  const parsed = await parseJsonResponse(res);
  if (!parsed.ok) throw new Error(parsed.error);
  const json = parsed.json;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || 'Could not obtain a Flutterwave access token.');
  }

  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 300) * 1000 };
  return cachedToken.accessToken;
}
