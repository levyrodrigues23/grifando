import { afterEach, describe, expect, it, vi } from "vitest";

import { aiErrorResponse } from "@/server/ai/aiErrorResponse";
import { readAICredentials, resolveAICredentials } from "@/server/ai/credentials";
import {
  AIKeyRejectedError,
  AIProviderUnavailableError,
  AIQuotaExceededError,
  InvalidAICredentialsError,
  accessErrorForStatus,
} from "@/server/ai/errors";

const h = (init: Record<string, string>) => new Headers(init);

afterEach(() => vi.unstubAllEnvs());

describe("readAICredentials", () => {
  it("trims the key", () =>
    expect(readAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "  k1 \n" }))).toEqual({
      provider: "gemini",
      apiKey: "k1",
    }));

  it("returns null without headers", () => expect(readAICredentials(h({}))).toBeNull());

  it("rejects unknown provider, oversized and non-printable keys", () => {
    expect(() => readAICredentials(h({ "x-ai-provider": "openai", "x-ai-key": "k" }))).toThrow(
      InvalidAICredentialsError,
    );
    expect(() =>
      readAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "k".repeat(257) })),
    ).toThrow(InvalidAICredentialsError);
    expect(() => readAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "k\u0001" }))).toThrow(
      InvalidAICredentialsError,
    );
  });
});

describe("resolveAICredentials", () => {
  it("never uses env keys in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GEMINI_API_KEY", "env");
    vi.stubEnv("AI_PROVIDER", "gemini");
    expect(resolveAICredentials(h({}))).toBeNull();
  });

  it("falls back to env keys outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "env");
    expect(resolveAICredentials(h({}))).toEqual({ provider: "gemini", apiKey: "env" });
  });

  it("prefers header credentials over env", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ANTHROPIC_API_KEY", "env");
    expect(resolveAICredentials(h({ "x-ai-provider": "gemini", "x-ai-key": "hdr" }))).toEqual({
      provider: "gemini",
      apiKey: "hdr",
    });
  });
});

describe("aiErrorResponse", () => {
  it("maps a rejected key to 401 AI_KEY_REJECTED without echoing the key", async () => {
    const res = aiErrorResponse(new AIKeyRejectedError())!;
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AI_KEY_REJECTED" });
  });

  it("returns null for unrelated errors", () => expect(aiErrorResponse(new Error("x"))).toBeNull());
});

describe("accessErrorForStatus", () => {
  it("classifies provider statuses", () => {
    expect(accessErrorForStatus(401)).toBeInstanceOf(AIKeyRejectedError);
    expect(accessErrorForStatus(403)).toBeInstanceOf(AIKeyRejectedError);
    expect(accessErrorForStatus(400, "API key not valid. Please pass a valid API key.")).toBeInstanceOf(
      AIKeyRejectedError,
    );
    expect(accessErrorForStatus(400, "bad schema")).toBeNull();
    expect(accessErrorForStatus(429)).toBeInstanceOf(AIQuotaExceededError);
    expect(accessErrorForStatus(503)).toBeInstanceOf(AIProviderUnavailableError);
    expect(accessErrorForStatus(404)).toBeNull();
  });
});
