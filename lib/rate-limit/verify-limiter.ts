/**
 * Rate limiting for /verify/[public_id] (docs/blueprint.md §3.4, §6;
 * CLAUDE.md rule #6: "must be rate-limited per IP"). Upstash REST credentials
 * are still not configured (docs/session-handoff.md §2/§3) — per CLAUDE.md's
 * free-tier discipline ("build and iterate against local/mock
 * implementations behind the same interface"), this is an in-memory
 * sliding-window limiter behind the same `RateLimiter` shape a real
 * `@upstash/ratelimit` instance would satisfy, so swapping one for the other
 * later is a one-function change in `getVerifyRateLimiter`, not a rewrite of
 * every call site.
 *
 * Known limitation, worth remembering before trusting this in production:
 * a Vercel serverless deployment can run multiple isolated instances, each
 * with its own module-level Map, so this limiter's window is per-instance,
 * not truly global per IP. That's an acceptable gap for a mock — Upstash
 * (a shared external store) is what actually closes it, per docs/blueprint.md
 * §8's tech-stack table.
 */

export type RateLimitResult = { success: boolean; remaining: number; resetMs: number };

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10; // matches docs/blueprint.md §6's "e.g. 10 lookups/min/IP"

class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  async limit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const existing = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (existing.length >= MAX_REQUESTS_PER_WINDOW) {
      this.hits.set(key, existing);
      return { success: false, remaining: 0, resetMs: existing[0] + WINDOW_MS - now };
    }

    existing.push(now);
    this.hits.set(key, existing);
    return { success: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.length, resetMs: WINDOW_MS };
  }
}

let limiter: RateLimiter | null = null;

/**
 * Swap point for real Upstash: once UPSTASH_REDIS_REST_URL/TOKEN are set
 * (docs/session-handoff.md §2), branch here to construct an
 * `@upstash/ratelimit` Ratelimit instance instead — it already satisfies
 * this same `RateLimiter` interface (`.limit(key)` returning `{ success }`),
 * so app/verify/[public_id]/page.tsx doesn't change at all.
 */
export function getVerifyRateLimiter(): RateLimiter {
  if (!limiter) limiter = new InMemoryRateLimiter();
  return limiter;
}
