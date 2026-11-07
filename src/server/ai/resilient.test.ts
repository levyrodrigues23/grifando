import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  AIKeyRejectedError,
  AIProviderUnavailableError,
  AIQuotaExceededError,
} from "@/server/ai/errors";
import type { AIProvider } from "@/server/ai/provider";
import { isOverloaded, withResilience } from "@/server/ai/resilient";

type FakeProvider = { [K in keyof AIProvider]: Mock<AIProvider[K]> };

function fakeProvider(): FakeProvider {
  return {
    analyzeWriting: vi.fn<AIProvider["analyzeWriting"]>(),
    generateExercises: vi.fn<AIProvider["generateExercises"]>(),
    continueInterview: vi.fn<AIProvider["continueInterview"]>(),
    explainAttempt: vi.fn<AIProvider["explainAttempt"]>(),
  };
}

const overloaded = () => Object.assign(new Error("overloaded"), { status: 503 });

afterEach(() => {
  vi.useRealTimers();
});

describe("isOverloaded", () => {
  it("recognises overload shapes and rejects the rest", () => {
    expect(isOverloaded(new AIProviderUnavailableError())).toBe(true);
    expect(isOverloaded(Object.assign(new Error("x"), { status: 503 }))).toBe(true);
    expect(isOverloaded(Object.assign(new Error("x"), { status: 529 }))).toBe(true);
    expect(isOverloaded(Object.assign(new Error("x"), { status: "UNAVAILABLE" }))).toBe(true);
    expect(isOverloaded({ error: { type: "overloaded_error" } })).toBe(true);
    expect(isOverloaded(new AIKeyRejectedError())).toBe(false);
    expect(isOverloaded(new AIQuotaExceededError())).toBe(false);
    expect(isOverloaded(new Error("boom"))).toBe(false);
    expect(isOverloaded(null)).toBe(false);
  });
});

describe("withResilience", () => {
  it("retries once on the fallback when the primary is overloaded", async () => {
    const primary = fakeProvider();
    const fallback = fakeProvider();
    primary.generateExercises.mockRejectedValue(overloaded());
    fallback.generateExercises.mockResolvedValue([]);
    const wrapped = withResilience(primary, fallback, { timeoutMs: 1000 });

    await expect(wrapped.generateExercises([])).resolves.toEqual([]);
    expect(primary.generateExercises).toHaveBeenCalledTimes(1);
    expect(fallback.generateExercises).toHaveBeenCalledTimes(1);
  });

  it("does not retry on a rejected key or exhausted quota", async () => {
    for (const error of [new AIKeyRejectedError(), new AIQuotaExceededError()]) {
      const primary = fakeProvider();
      const fallback = fakeProvider();
      primary.continueInterview.mockRejectedValue(error);
      const wrapped = withResilience(primary, fallback, { timeoutMs: 1000 });

      await expect(wrapped.continueInterview([])).rejects.toBe(error);
      expect(fallback.continueInterview).not.toHaveBeenCalled();
    }
  });

  it("times out a hanging call and then uses the fallback", async () => {
    vi.useFakeTimers();
    const fromFallback = {} as Awaited<ReturnType<AIProvider["explainAttempt"]>>;
    const primary = fakeProvider();
    const fallback = fakeProvider();
    primary.explainAttempt.mockReturnValue(new Promise(() => {}));
    fallback.explainAttempt.mockResolvedValue(fromFallback);
    const wrapped = withResilience(primary, fallback, { timeoutMs: 60_000 });

    const result = wrapped.explainAttempt({} as never);
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(result).resolves.toBe(fromFallback);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("throws AIProviderUnavailableError when both are overloaded", async () => {
    const primary = fakeProvider();
    const fallback = fakeProvider();
    primary.analyzeWriting.mockRejectedValue(overloaded());
    fallback.analyzeWriting.mockRejectedValue(overloaded());
    const wrapped = withResilience(primary, fallback, { timeoutMs: 1000 });

    await expect(wrapped.analyzeWriting({} as never)).rejects.toBeInstanceOf(
      AIProviderUnavailableError,
    );
  });

  it("throws AIProviderUnavailableError, not the timeout error, when both time out", async () => {
    vi.useFakeTimers();
    const primary = fakeProvider();
    const fallback = fakeProvider();
    primary.analyzeWriting.mockReturnValue(new Promise(() => {}));
    fallback.analyzeWriting.mockReturnValue(new Promise(() => {}));
    const wrapped = withResilience(primary, fallback, { timeoutMs: 100 });

    const result = wrapped.analyzeWriting({} as never);
    const assertion = expect(result).rejects.toBeInstanceOf(AIProviderUnavailableError);
    await vi.advanceTimersByTimeAsync(200);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes a non-overload error from the fallback through untouched", async () => {
    const primary = fakeProvider();
    const fallback = fakeProvider();
    const error = new AIKeyRejectedError();
    primary.analyzeWriting.mockRejectedValue(overloaded());
    fallback.analyzeWriting.mockRejectedValue(error);
    const wrapped = withResilience(primary, fallback, { timeoutMs: 1000 });

    await expect(wrapped.analyzeWriting({} as never)).rejects.toBe(error);
  });
});
