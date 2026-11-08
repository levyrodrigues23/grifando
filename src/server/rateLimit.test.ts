import { afterAll, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { consume, rateLimitResponse, RATE_LIMIT_MESSAGE, type LimitRule } from "@/server/rateLimit";

const prisma = createTestPrismaClient();
const rule: LimitRule = { name: "t", max: 3, windowSeconds: 60 };
const t0 = new Date("2026-01-01T00:00:10Z");

beforeEach(() => resetDatabase(prisma));
afterAll(() => prisma.$disconnect());

describe("consume", () => {
  it("allows max calls then blocks with retryAfterSeconds within the window", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await consume(prisma, "u", [rule], t0)).toEqual({ allowed: true });
    }
    expect(await consume(prisma, "u", [rule], t0)).toEqual({
      allowed: false,
      retryAfterSeconds: 50,
    });
  });

  it("allows again in a new window", async () => {
    for (let i = 0; i < 4; i++) await consume(prisma, "u", [rule], t0);
    const next = new Date(t0.getTime() + 60_000);
    expect(await consume(prisma, "u", [rule], next)).toEqual({ allowed: true });
  });

  it("keeps subjects independent", async () => {
    for (let i = 0; i < 4; i++) await consume(prisma, "a", [rule], t0);
    expect(await consume(prisma, "b", [rule], t0)).toEqual({ allowed: true });
  });

  it("blocks when any rule is exceeded and reports the largest retry", async () => {
    const rules: LimitRule[] = [
      { name: "m", max: 1, windowSeconds: 60 },
      { name: "d", max: 1, windowSeconds: 3600 },
    ];
    await consume(prisma, "u", rules, t0);
    expect(await consume(prisma, "u", rules, t0)).toEqual({
      allowed: false,
      retryAfterSeconds: 3590,
    });
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After once the bucket is exhausted", async () => {
    // Pin the clock mid-window so the 60s bucket can't roll over during the loop.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T12:00:10Z"));
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const request = new Request("http://test", { headers: { "x-forwarded-for": "203.0.113.9" } });
    for (let i = 0; i < 5; i++) {
      expect(await rateLimitResponse(prisma, request, "u", "generation")).toBeNull();
    }
    const response = await rateLimitResponse(prisma, request, "u", "generation");
    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect(await response?.json()).toEqual({ error: RATE_LIMIT_MESSAGE });
  });

  it("stores no raw IP", async () => {
    const request = new Request("http://test", { headers: { "x-forwarded-for": "203.0.113.9" } });
    await rateLimitResponse(prisma, request, "u", "write");
    const rows = await prisma.rateLimitWindow.findMany();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.key.includes("203.0.113.9"))).toBe(false);
  });
});
