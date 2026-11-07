import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AIKeyRejectedError } from "@/server/ai/errors";

const mocks = vi.hoisted(() => ({ generatePracticeSet: vi.fn() }));

vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/session/currentUser", () => ({
  getCurrentUserId: vi.fn(async () => "visitor-1"),
  ensureUser: vi.fn(async () => undefined),
}));
vi.mock("@/server/rateLimit", () => ({
  aiRateLimits: { generation: {}, analysis: {} },
  rateLimitResponse: () => null,
}));
vi.mock("@/server/domain/exercises/exerciseService", () => ({
  createExerciseGenerationService: () => ({ generatePracticeSet: mocks.generatePracticeSet }),
}));

import { POST } from "./route";

function post(headers: Record<string, string> = {}) {
  return new Request("http://test/api/exercises", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: "{}",
  });
}

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  mocks.generatePracticeSet.mockReset();
});

afterAll(() => vi.unstubAllEnvs());

describe("POST /api/exercises", () => {
  it("answers 401 AI_KEY_REQUIRED without credentials", async () => {
    const res = await POST(post());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AI_KEY_REQUIRED" });
  });

  it("maps a typed AI error from generation to its coded response", async () => {
    mocks.generatePracticeSet.mockRejectedValue(new AIKeyRejectedError());
    const res = await POST(post({ "x-ai-provider": "gemini", "x-ai-key": "k1" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AI_KEY_REJECTED" });
  });
});
