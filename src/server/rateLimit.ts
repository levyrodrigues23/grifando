import { NextResponse } from "next/server";

import type { PrismaClient } from "@/generated/prisma/client";
import { hashedClientIp } from "@/server/clientIp";

// Fixed-window counters in Postgres (table RateLimitWindow), so limits hold
// across serverless instances. Expired windows are deleted by the cleanup cron.

export type LimitRule = { name: string; max: number; windowSeconds: number };

export const RATE_LIMITS = {
  analysis: [
    { name: "analysis-min", max: 10, windowSeconds: 60 },
    { name: "analysis-day", max: 100, windowSeconds: 86_400 },
  ],
  generation: [
    { name: "generation-min", max: 5, windowSeconds: 60 },
    { name: "generation-day", max: 50, windowSeconds: 86_400 },
  ],
  write: [{ name: "write-min", max: 60, windowSeconds: 60 }],
  keyTest: [{ name: "keytest-hour", max: 5, windowSeconds: 3_600 }],
  ip: [{ name: "ip-day", max: 300, windowSeconds: 86_400 }],
} satisfies Record<string, LimitRule[]>;

export const RATE_LIMIT_MESSAGE = "You're going a bit fast. Wait a moment and try again.";

export type ConsumeResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Db = Pick<PrismaClient, "$queryRaw">;

// Increments every rule's counter (so counts stay honest) and blocks when any
// rule is over its max; with several blocking, the longest wait is reported.
export async function consume(
  prisma: Db,
  subject: string,
  rules: LimitRule[],
  now: Date = new Date(),
): Promise<ConsumeResult> {
  let retryAfterSeconds = 0;
  for (const rule of rules) {
    const windowMs = rule.windowSeconds * 1000;
    const startMs = Math.floor(now.getTime() / windowMs) * windowMs;
    const key = `${rule.name}:${subject}`;
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitWindow" ("key", "windowStart", "count")
      VALUES (${key}, ${new Date(startMs)}, 1)
      ON CONFLICT ("key", "windowStart")
      DO UPDATE SET "count" = "RateLimitWindow"."count" + 1
      RETURNING "count"`;
    if (rows[0].count > rule.max) {
      const retry = Math.max(1, Math.ceil((startMs + windowMs - now.getTime()) / 1000));
      retryAfterSeconds = Math.max(retryAfterSeconds, retry);
    }
  }
  return retryAfterSeconds > 0 ? { allowed: false, retryAfterSeconds } : { allowed: true };
}

// Returns the 429 response to send, or null when the call may proceed. Checks
// the bucket for the session and the per-IP ceiling for the hashed client IP.
export async function rateLimitResponse(
  prisma: Db,
  request: Request,
  userId: string,
  bucket: keyof typeof RATE_LIMITS,
): Promise<NextResponse | null> {
  const results = [
    await consume(prisma, userId, RATE_LIMITS[bucket]),
    await consume(prisma, hashedClientIp(request.headers), RATE_LIMITS.ip),
  ];
  let retryAfter = 0;
  for (const result of results) {
    if (!result.allowed) retryAfter = Math.max(retryAfter, result.retryAfterSeconds);
  }
  if (retryAfter === 0) return null;
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
