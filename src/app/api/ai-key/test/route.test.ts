import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIKeyRejectedError, AIProviderUnavailableError, AIQuotaExceededError } from "@/server/ai/errors";

const mocks = vi.hoisted(() => ({
  geminiTestKey: vi.fn(),
  anthropicTestKey: vi.fn(),
  rateLimitResponse: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/session/currentUser", () => ({
  getCurrentUserId: vi.fn(async () => "visitor-1"),
  ensureUser: vi.fn(async () => undefined),
}));
vi.mock("@/server/rateLimit", () => ({ rateLimitResponse: mocks.rateLimitResponse }));
vi.mock("@/server/ai/providers/gemini", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai/providers/gemini")>()),
  testKey: mocks.geminiTestKey,
}));
vi.mock("@/server/ai/providers/anthropic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai/providers/anthropic")>()),
  testKey: mocks.anthropicTestKey,
}));

import { POST } from "./route";

function post(headers: Record<string, string> = { "x-ai-provider": "gemini", "x-ai-key": "test-key" }) {
  return new Request("http://test/api/ai-key/test", { method: "POST", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  // vitest loads .env, which may hold real dev keys — the route must not use them.
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  mocks.rateLimitResponse.mockResolvedValue(null);
});

describe("POST /api/ai-key/test", () => {
  it("answers works when the provider accepts the key", async () => {
    mocks.geminiTestKey.mockResolvedValue(undefined);
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "works" });
    expect(mocks.geminiTestKey).toHaveBeenCalledTimes(1);
    expect(mocks.anthropicTestKey).not.toHaveBeenCalled();
  });

  it("uses the Anthropic helper for an Anthropic key", async () => {
    mocks.anthropicTestKey.mockResolvedValue(undefined);
    const res = await POST(post({ "x-ai-provider": "anthropic", "x-ai-key": "test-key" }));
    expect(await res.json()).toEqual({ status: "works" });
    expect(mocks.anthropicTestKey).toHaveBeenCalledTimes(1);
  });

  it("answers invalid when the provider rejects the key", async () => {
    mocks.geminiTestKey.mockRejectedValue(new AIKeyRejectedError());
    expect(await (await POST(post())).json()).toEqual({ status: "invalid" });
  });

  it("answers invalid for a malformed key without calling the provider", async () => {
    const res = await POST(post({ "x-ai-provider": "openai", "x-ai-key": "test-key" }));
    expect(await res.json()).toEqual({ status: "invalid" });
    expect(mocks.geminiTestKey).not.toHaveBeenCalled();
  });

  it("answers busy when the provider is unavailable or out of quota", async () => {
    mocks.geminiTestKey.mockRejectedValueOnce(new AIProviderUnavailableError());
    expect(await (await POST(post())).json()).toEqual({ status: "busy" });
    mocks.geminiTestKey.mockRejectedValueOnce(new AIQuotaExceededError());
    expect(await (await POST(post())).json()).toEqual({ status: "busy" });
  });

  it("answers busy when the provider does not answer in time", async () => {
    vi.useFakeTimers();
    try {
      mocks.geminiTestKey.mockReturnValue(new Promise(() => {}));
      const pending = POST(post());
      await vi.advanceTimersByTimeAsync(20_000);
      expect(await (await pending).json()).toEqual({ status: "busy" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes the rate limiter's 429 through without calling the provider", async () => {
    mocks.rateLimitResponse.mockResolvedValue(
      NextResponse.json({ error: "slow down" }, { status: 429, headers: { "Retry-After": "60" } }),
    );
    const res = await POST(post());
    expect(res.status).toBe(429);
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(expect.anything(), expect.any(Request), "visitor-1", "keyTest");
    expect(mocks.geminiTestKey).not.toHaveBeenCalled();
  });

  it("answers 401 AI_KEY_REQUIRED when no key headers are sent (env keys are never tested)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "dev-key");
    vi.stubEnv("AI_PROVIDER", "gemini");
    const res = await POST(post({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AI_KEY_REQUIRED" });
    expect(mocks.geminiTestKey).not.toHaveBeenCalled();
    expect(mocks.rateLimitResponse).not.toHaveBeenCalled();
  });
});
