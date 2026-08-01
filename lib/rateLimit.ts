/**
 * Minimal in-memory sliding-window rate limiter keyed by wallet.
 *
 * NOTE: state lives in a single process. On serverless platforms (e.g. Vercel
 * functions) with multiple instances this is best-effort, not a hard global
 * limit — for strict enforcement across instances, back it with a shared
 * store (Redis) or a platform rate limiter.
 */

export interface RateLimiter {
  /** Returns true when a call for `key` is allowed, false when rate-limited. */
  check(key: string, now?: number): boolean;
  /** Clears all counters (used in tests). */
  reset(): void;
}

/**
 * Creates a sliding-window limiter allowing up to `maxRequests` calls per
 * `windowMs` per key. Passing `now` makes it deterministic in tests.
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number
): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key: string, now: number = Date.now()): boolean {
      const cutoff = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (recent.length >= maxRequests) {
        hits.set(key, recent);
        return false;
      }

      recent.push(now);
      hits.set(key, recent);

      // Opportunistic cleanup so a flood of distinct wallets can't grow the
      // map without bound.
      if (hits.size > 10_000) {
        for (const [k, timestamps] of hits) {
          if (timestamps.every((t) => t <= cutoff)) hits.delete(k);
        }
      }

      return true;
    },

    reset(): void {
      hits.clear();
    },
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Default limiter for the attendance API, configurable via env vars. */
export const attendanceLimiter = createRateLimiter(
  positiveInt(process.env.ATTENDANCE_RATE_LIMIT_MAX, 5),
  positiveInt(process.env.ATTENDANCE_RATE_LIMIT_WINDOW_MS, 60_000)
);
