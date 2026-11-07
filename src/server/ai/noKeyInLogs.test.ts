import { inspect } from "node:util";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { createPrismaClient } from "@/server/db/client";
import { resetDatabase } from "@/server/db/test-utils";

const SECRET = "sk-secret-123";

const holder = vi.hoisted(() => ({ prisma: undefined as unknown }));

vi.mock("@/server/db/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/db/client")>();
  holder.prisma = original.createPrismaClient(process.env.TEST_DATABASE_URL!);
  return { ...original, prisma: holder.prisma };
});
vi.mock("@/server/session/currentUser", () => ({
  getCurrentUserId: vi.fn(async () => "visitor-1"),
  ensureUser: vi.fn(async () => undefined),
}));
vi.mock("@/server/rateLimit", () => ({ rateLimitResponse: vi.fn(async () => null) }));
vi.mock("@/server/ai/client", () => ({ createAIProvider: vi.fn() }));

import { createAIProvider } from "@/server/ai/client";
import { POST } from "@/app/api/writing-sessions/route";

const testPrisma = holder.prisma as ReturnType<typeof createPrismaClient>;

// Shaped like an SDK error: a generic Error that carries the request config,
// headers included, as an own property.
function sdkLikeError() {
  return Object.assign(new Error("Request failed"), {
    request: { headers: { "x-api-key": SECRET, authorization: `Bearer ${SECRET}` } },
  });
}

function post() {
  return new Request("http://test/api/writing-sessions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-provider": "anthropic", "x-ai-key": SECRET },
    body: JSON.stringify({ promptType: "FREE", originalText: "I goed home." }),
  });
}

let logged: unknown[][];

beforeEach(async () => {
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  logged = [];
  const capture = (...args: unknown[]) => void logged.push(args);
  vi.spyOn(console, "error").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
  vi.spyOn(console, "log").mockImplementation(capture);
  await resetDatabase(testPrisma);
  await testPrisma.user.create({ data: { id: "visitor-1" } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await testPrisma.$disconnect();
});

function expectNoSecretLogged() {
  for (const args of logged) {
    for (const arg of args) {
      expect(inspect(arg, { depth: null, showHidden: true })).not.toContain(SECRET);
    }
  }
}

describe("the visitor's AI key never reaches the logs", () => {
  it("when the provider call throws a generic error", async () => {
    vi.mocked(createAIProvider).mockReturnValue({
      provider: {
        analyzeWriting: vi.fn(async () => {
          throw sdkLikeError();
        }),
      } as never,
      modelId: "test-model",
    });

    const res = await POST(post());
    expect(res.status).toBe(201);
    expectNoSecretLogged();
  });

  it("when building the provider throws a generic error that reaches the route's log", async () => {
    vi.mocked(createAIProvider).mockImplementation(() => {
      throw sdkLikeError();
    });

    const res = await POST(post());
    expect(res.status).toBe(500);
    expect(logged.length).toBeGreaterThan(0);
    expectNoSecretLogged();
  });
});
