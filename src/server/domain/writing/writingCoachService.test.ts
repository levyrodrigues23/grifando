import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PromptType } from "@/generated/prisma/enums";
import { AIResponseValidationError } from "@/server/ai/errors";
import type { AIProvider } from "@/server/ai/provider";
import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { createWritingCoachService } from "@/server/domain/writing/writingCoachService";

const prisma = createTestPrismaClient();
const userId = "test-user";

beforeEach(async () => {
  await resetDatabase(prisma);
  await prisma.user.create({
    data: { id: userId, email: "test@example.com", displayName: "Test User" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function fakeAnalysisResult() {
  return {
    correctedText: "I depend on this library.",
    naturalText: "This library is something I rely on.",
    overallFeedback: "Nice, just one preposition slip.",
    scores: { grammar: 80, vocabulary: 85, clarity: 90, naturalness: 75 },
    mistakes: [
      {
        originalSpan: "depend of",
        correctedSpan: "depend on",
        category: "PREPOSITIONS" as const,
        severity: "ERROR" as const,
        explanation: "Use 'depend on', not 'depend of'.",
        example: "I depend on my team.",
        patternKey: "depend-on",
      },
      {
        originalSpan: "depend of this too",
        correctedSpan: "depend on this too",
        category: "PREPOSITIONS" as const,
        severity: "ERROR" as const,
        explanation: "Same preposition mistake again.",
        example: "This depends on the config.",
        patternKey: "depend-on",
      },
    ],
  };
}

describe("writingCoachService.submitWriting", () => {
  it("persists the analysis and folds repeated mistakes into one pattern", async () => {
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn().mockResolvedValue(fakeAnalysisResult()),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
    };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    const result = await service.submitWriting({
      userId,
      promptType: PromptType.FREE,
      originalText: "I depend of this library.",
    });

    expect(result.status).toBe("analyzed");
    if (result.status !== "analyzed") throw new Error("expected analyzed result");

    expect(result.session.status).toBe("ANALYZED");
    expect(result.session.analysis?.correctedText).toBe("I depend on this library.");
    expect(result.session.analysis?.occurrences).toHaveLength(2);

    const patterns = await prisma.mistakePattern.findMany({ where: { userId } });
    expect(patterns).toHaveLength(1);
    expect(patterns[0].occurrenceCount).toBe(2);
  });

  it("marks the session FAILED and preserves the original text when the AI call fails", async () => {
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn().mockRejectedValue(new AIResponseValidationError("bad response", [])),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
    };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    const result = await service.submitWriting({
      userId,
      promptType: PromptType.FREE,
      originalText: "some original text",
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") throw new Error("expected failed result");
    expect(result.message).toContain("has not been lost");

    const session = await prisma.writingSession.findUniqueOrThrow({ where: { id: result.sessionId } });
    expect(session.status).toBe("FAILED");
    expect(session.originalText).toBe("some original text");
  });

  it("re-analyzes the failed session on retry instead of creating a duplicate", async () => {
    const analyzeWriting = vi
      .fn()
      .mockRejectedValueOnce(new AIResponseValidationError("bad response", []))
      .mockResolvedValueOnce(fakeAnalysisResult());
    const aiProvider: AIProvider = { analyzeWriting, generateExercises: vi.fn(), continueInterview: vi.fn() };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    const failed = await service.submitWriting({
      userId,
      promptType: PromptType.FREE,
      originalText: "I depend of this library",
    });
    if (failed.status !== "failed") throw new Error("expected failed result");

    const retried = await service.submitWriting({
      userId,
      promptType: PromptType.FREE,
      originalText: "I depend of this library.",
      retrySessionId: failed.sessionId,
    });
    if (retried.status !== "analyzed") throw new Error("expected analyzed result");

    expect(retried.session.id).toBe(failed.sessionId);
    expect(retried.session.status).toBe("ANALYZED");
    expect(retried.session.originalText).toBe("I depend of this library.");
    expect(await prisma.writingSession.count({ where: { userId } })).toBe(1);
  });

  it("creates a new session when the retry id isn't a FAILED session of this user", async () => {
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn().mockResolvedValue({ ...fakeAnalysisResult(), mistakes: [] }),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
    };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    const analyzed = await service.submitWriting({ userId, promptType: PromptType.FREE, originalText: "first" });
    if (analyzed.status !== "analyzed") throw new Error("expected analyzed result");

    const second = await service.submitWriting({
      userId,
      promptType: PromptType.FREE,
      originalText: "second",
      retrySessionId: analyzed.session.id,
    });
    if (second.status !== "analyzed") throw new Error("expected analyzed result");

    expect(second.session.id).not.toBe(analyzed.session.id);
    const first = await prisma.writingSession.findUniqueOrThrow({ where: { id: analyzed.session.id } });
    expect(first.originalText).toBe("first");
  });

  it("stores the Portuguese-interference flag and filters patterns by it", async () => {
    const [first] = fakeAnalysisResult().mistakes;
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn().mockResolvedValue({
        ...fakeAnalysisResult(),
        mistakes: [
          { ...first, l1Transfer: true },
          { ...first, category: "ARTICLES" as const, patternKey: "the-article", l1Transfer: false },
        ],
      }),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
    };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    await service.submitWriting({ userId, promptType: PromptType.FREE, originalText: "I depend of the it." });

    const flagged = await prisma.mistakeOccurrence.findMany({ where: { l1Transfer: true } });
    expect(flagged).toHaveLength(1);

    const patterns = createMistakePatternRepository(prisma);
    expect(await patterns.listByUser(userId)).toHaveLength(2);
    const fromPortuguese = await patterns.listByUser(userId, { l1TransferOnly: true });
    expect(fromPortuguese.map((p) => p.patternKey)).toEqual(["depend-on"]);
  });

  it("drops a MASTERED pattern to IMPROVING when the mistake reappears in writing", async () => {
    await prisma.mistakePattern.create({
      data: {
        userId,
        category: "PREPOSITIONS",
        patternKey: "depend-on",
        exampleOriginal: "depend of",
        exampleCorrection: "depend on",
        masteryLevel: "MASTERED",
      },
    });
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn().mockResolvedValue({
        ...fakeAnalysisResult(),
        mistakes: [fakeAnalysisResult().mistakes[0]],
      }),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
    };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    await service.submitWriting({ userId, promptType: PromptType.FREE, originalText: "I depend of it." });

    const pattern = await prisma.mistakePattern.findFirstOrThrow({ where: { userId } });
    expect(pattern.masteryLevel).toBe("IMPROVING");
    expect(pattern.consecutiveCorrectCount).toBe(0);
  });

  it("passes codeSnippet to the AI but never persists it on the session", async () => {
    const analyzeWriting = vi.fn().mockResolvedValue({ ...fakeAnalysisResult(), mistakes: [] });
    const aiProvider: AIProvider = { analyzeWriting, generateExercises: vi.fn(), continueInterview: vi.fn() };
    const service = createWritingCoachService({ prisma, aiProvider, modelId: "test-model" });

    await service.submitWriting({
      userId,
      promptType: PromptType.EXPLAIN_CODE,
      promptText: "Explain what this code does.",
      originalText: "This function checks whether the user already exists.",
      codeSnippet: "export async function registerUser() {}",
    });

    expect(analyzeWriting).toHaveBeenCalledWith(
      expect.objectContaining({ codeSnippet: "export async function registerUser() {}" }),
    );

    const session = await prisma.writingSession.findFirstOrThrow({ where: { userId } });
    expect(session).not.toHaveProperty("codeSnippet");
  });
});
