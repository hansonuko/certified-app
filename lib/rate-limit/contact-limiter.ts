/**
 * Rate limiting for the contact/hire relay (docs/blueprint.md §6, Phase 6:
 * "5 messages/hour/IP"). Same in-memory-until-Upstash-is-configured shape as
 * lib/rate-limit/verify-limiter.ts — see that file's header comment for the
 * reasoning (mock-until-configured per CLAUDE.md's free-tier discipline,
 * plus the same per-instance-not-global caveat). Kept as its own module
 * rather than reusing verify-limiter.ts directly since the two protect
 * different actions with different thresholds and shouldn't share a bucket.
 */
import type { RateLimiter, RateLimitResult } from './verify-limiter';

const WINDOW_MS = 60 * 60_000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // docs/blueprint.md §6: "e.g. 5 messages/hour/IP"

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

/** Swap point for real Upstash — see verify-limiter.ts's equivalent comment. */
export function getContactRateLimiter(): RateLimiter {
  if (!limiter) limiter = new InMemoryRateLimiter();
  return limiter;
}
