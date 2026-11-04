import { NextResponse } from "next/server";

// In-memory token bucket (SPEC.md §11): enough for a single-user app running in
// one process. Each AI-calling route consumes a token before calling its
// service; an empty bucket answers 429 so a double click, a render loop, or a
// script can't run up the AI bill. State is per process and resets on restart —
// a multi-instance deployment would need a shared store (Redis, the database).

export type BucketConfig = { capacity: number; refillPerMinute: number };

export type ConsumeResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type BucketState = { tokens: number; updatedAt: number };

export function createRateLimiter(config: BucketConfig, now: () => number = Date.now) {
  const buckets = new Map<string, BucketState>();
  const refillPerMs = config.refillPerMinute / 60_000;

  return {
    consume(key: string): ConsumeResult {
      const time = now();
      const previous = buckets.get(key) ?? { tokens: config.capacity, updatedAt: time };
      const tokens = Math.min(config.capacity, previous.tokens + (time - previous.updatedAt) * refillPerMs);

      if (tokens < 1) {
        buckets.set(key, { tokens, updatedAt: time });
        return { allowed: false, retryAfterSeconds: Math.ceil((1 - tokens) / refillPerMs / 1000) };
      }

      buckets.set(key, { tokens: tokens - 1, updatedAt: time });
      return { allowed: true };
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

// Writing analysis (Writing Coach, Daily, Technical, Explain Code, interview
// answers) and generation calls (exercise sets, interview start) are limited
// separately: a burst of practice-set generation shouldn't block writing.
export const aiRateLimits = {
  analysis: createRateLimiter({ capacity: 10, refillPerMinute: 10 }),
  generation: createRateLimiter({ capacity: 5, refillPerMinute: 5 }),
};

export const RATE_LIMIT_MESSAGE = "You're going a bit fast. Wait a moment and try again.";

// Returns the 429 response to send, or null when the call may proceed.
export function rateLimitResponse(limiter: RateLimiter, key: string): NextResponse | null {
  const result = limiter.consume(key);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}
