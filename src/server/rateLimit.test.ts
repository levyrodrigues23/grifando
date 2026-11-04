import { describe, expect, it } from "vitest";

import { createRateLimiter, rateLimitResponse } from "@/server/rateLimit";

function fakeClock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("createRateLimiter", () => {
  it("allows up to capacity, then refuses with a retry hint", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 3, refillPerMinute: 6 }, clock.now);

    expect(limiter.consume("u").allowed).toBe(true);
    expect(limiter.consume("u").allowed).toBe(true);
    expect(limiter.consume("u").allowed).toBe(true);
    expect(limiter.consume("u")).toEqual({ allowed: false, retryAfterSeconds: 10 });
  });

  it("refills over time without exceeding capacity", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ capacity: 2, refillPerMinute: 6 }, clock.now);
    limiter.consume("u");
    limiter.consume("u");

    clock.advance(10_000); // one token back
    expect(limiter.consume("u").allowed).toBe(true);
    expect(limiter.consume("u").allowed).toBe(false);

    clock.advance(60 * 60_000); // long idle: still capped at 2
    expect(limiter.consume("u").allowed).toBe(true);
    expect(limiter.consume("u").allowed).toBe(true);
    expect(limiter.consume("u").allowed).toBe(false);
  });

  it("keeps separate buckets per key", () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerMinute: 1 }, fakeClock().now);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("b").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
  });
});

describe("rateLimitResponse", () => {
  it("returns null while allowed and a 429 with Retry-After once exhausted", async () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerMinute: 2 }, fakeClock().now);
    expect(rateLimitResponse(limiter, "u")).toBeNull();

    const response = rateLimitResponse(limiter, "u");
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("30");
    expect(await response?.json()).toEqual({ error: expect.any(String) });
  });
});
