import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { createPrismaClient } from "@/server/db/client";
import { resetDatabase } from "@/server/db/test-utils";

const holder = vi.hoisted(() => ({ prisma: undefined as unknown }));

vi.mock("@/server/db/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/db/client")>();
  // Not via test-utils: it imports this (mocked) module, which would deadlock.
  holder.prisma = original.createPrismaClient(process.env.TEST_DATABASE_URL!);
  return { ...original, prisma: holder.prisma };
});
vi.mock("@/server/session/currentUser", () => ({
  getCurrentUserId: vi.fn(async () => "visitor-1"),
  ensureUser: vi.fn(async () => undefined),
}));

import { POST } from "./route";

const testPrisma = holder.prisma as ReturnType<typeof createPrismaClient>;

function post(headers: Record<string, string> = {}) {
  return new Request("http://test/api/writing-sessions", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ promptType: "FREE", originalText: "I goed home." }),
  });
}

beforeEach(async () => {
  // vitest loads .env, which may hold real dev keys — the route must not see them.
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  await resetDatabase(testPrisma);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await testPrisma.$disconnect();
});

describe("POST /api/writing-sessions without an AI key", () => {
  it("answers 401 AI_KEY_REQUIRED and creates no WritingSession", async () => {
    const res = await POST(post());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AI_KEY_REQUIRED" });
    expect(await testPrisma.writingSession.count()).toBe(0);
  });

  it("answers 400 AI_KEY_INVALID for a malformed key", async () => {
    const res = await POST(post({ "x-ai-provider": "openai", "x-ai-key": "k" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "AI_KEY_INVALID" });
    expect(await testPrisma.writingSession.count()).toBe(0);
  });
});
