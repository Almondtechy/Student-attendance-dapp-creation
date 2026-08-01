import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../rateLimit";

describe("createRateLimiter", () => {
  it("allows requests up to the configured limit", () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.check("0xabc", 1000)).toBe(true);
    expect(limiter.check("0xabc", 2000)).toBe(true);
    expect(limiter.check("0xabc", 3000)).toBe(true);
  });

  it("blocks requests beyond the limit within the window", () => {
    const limiter = createRateLimiter(3, 60_000);
    limiter.check("0xabc", 1000);
    limiter.check("0xabc", 2000);
    limiter.check("0xabc", 3000);
    expect(limiter.check("0xabc", 4000)).toBe(false);
  });

  it("slides the window: old requests expire", () => {
    const limiter = createRateLimiter(2, 1000);
    limiter.check("0xabc", 1000);
    limiter.check("0xabc", 1500);
    // 3rd request is still within the 1s window → blocked
    expect(limiter.check("0xabc", 1999)).toBe(false);
    // After the window slides past the first request, it's allowed again
    expect(limiter.check("0xabc", 2001)).toBe(true);
  });

  it("tracks each key (wallet) independently", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("0xaaa", 1000)).toBe(true);
    expect(limiter.check("0xaaa", 1001)).toBe(false);
    expect(limiter.check("0xbbb", 1002)).toBe(true);
  });

  it("is case-sensitive: keys must be normalized by the caller", () => {
    // The route lowercases wallets before calling check(); the limiter
    // itself treats keys as opaque exact-match strings.
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("0xABC", 1000)).toBe(true);
    expect(limiter.check("0xABC", 1001)).toBe(false); // same exact key
    expect(limiter.check("0xabc", 1002)).toBe(true); // different key
  });

  it("reset clears all counters", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.check("0xabc", 1000);
    expect(limiter.check("0xabc", 1001)).toBe(false);
    limiter.reset();
    expect(limiter.check("0xabc", 1002)).toBe(true);
  });
});
