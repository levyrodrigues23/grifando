import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MasteryLevel, MistakeCategory } from "@/generated/prisma/enums";
import type { AIProvider } from "@/server/ai/provider";
import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import {
  createExerciseAttemptService,
  createExerciseGenerationService,
} from "@/server/domain/exercises/exerciseService";

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

async function seedPattern(
  overrides: { masteryLevel?: MasteryLevel; consecutiveCorrectCount?: number } = {},
) {
  return prisma.mistakePattern.create({
    data: {
      userId,
      category: MistakeCategory.PREPOSITIONS,
      patternKey: "depend-on",
      exampleOriginal: "I depend of this library.",
      exampleCorrection: "I depend on this library.",
      occurrenceCount: 3,
      ...overrides,
    },
  });
}

function fakeGeneratedExercise() {
  return {
    type: "MULTIPLE_CHOICE" as const,
    instruction: "Choose the correct sentence.",
    explanation: "Use 'depend on', not 'depend of'.",
    options: ["I depend of this library.", "I depend on this library."],
    correctOptionIndex: 1,
  };
}

describe("exerciseGenerationService.generatePracticeSet", () => {
  it("returns nothing when the user has no mistake patterns yet", async () => {
    const aiProvider: AIProvider = { analyzeWriting: vi.fn(), generateExercises: vi.fn(), continueInterview: vi.fn() };
    const service = createExerciseGenerationService({ prisma, aiProvider });

    const result = await service.generatePracticeSet(userId);

    expect(result).toEqual([]);
    expect(aiProvider.generateExercises).not.toHaveBeenCalled();
  });

  it("generates and persists one exercise per selected pattern", async () => {
    const pattern = await seedPattern();
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn(),
      generateExercises: vi.fn().mockResolvedValue([fakeGeneratedExercise()]),
      continueInterview: vi.fn(),
    };
    const service = createExerciseGenerationService({ prisma, aiProvider });

    const result = await service.generatePracticeSet(userId, 1);

    expect(result).toHaveLength(1);
    expect(result[0].sourcePatternId).toBe(pattern.id);
    expect(result[0].type).toBe("MULTIPLE_CHOICE");
  });
});

describe("exerciseAttemptService.submitAttempt", () => {
  it("records a correct attempt and promotes the pattern's mastery streak", async () => {
    const pattern = await seedPattern({
      masteryLevel: MasteryLevel.ACTIVE,
      consecutiveCorrectCount: 1,
    });
    const exercise = await prisma.exercise.create({
      data: {
        userId,
        type: "MULTIPLE_CHOICE",
        sourcePatternId: pattern.id,
        promptData: fakeGeneratedExercise(),
      },
    });
    const service = createExerciseAttemptService({ prisma });

    const result = await service.submitAttempt(exercise.id, "1");

    expect(result.isCorrect).toBe(true);

    const updatedPattern = await prisma.mistakePattern.findUniqueOrThrow({
      where: { id: pattern.id },
    });
    expect(updatedPattern.masteryLevel).toBe("IMPROVING");
    expect(updatedPattern.consecutiveCorrectCount).toBe(0);
    expect(updatedPattern.correctCount).toBe(pattern.correctCount + 1);
    expect(updatedPattern.incorrectCount).toBe(pattern.incorrectCount);
    expect(updatedPattern.lastPracticedAt.getTime()).toBeGreaterThanOrEqual(pattern.lastPracticedAt.getTime());
  });

  it("records an incorrect attempt and resets an IMPROVING pattern to ACTIVE", async () => {
    const pattern = await seedPattern({
      masteryLevel: MasteryLevel.IMPROVING,
      consecutiveCorrectCount: 1,
    });
    const exercise = await prisma.exercise.create({
      data: {
        userId,
        type: "MULTIPLE_CHOICE",
        sourcePatternId: pattern.id,
        promptData: fakeGeneratedExercise(),
      },
    });
    const service = createExerciseAttemptService({ prisma });

    const result = await service.submitAttempt(exercise.id, "0");

    expect(result.isCorrect).toBe(false);

    const updatedPattern = await prisma.mistakePattern.findUniqueOrThrow({
      where: { id: pattern.id },
    });
    expect(updatedPattern.masteryLevel).toBe("ACTIVE");
    expect(updatedPattern.incorrectCount).toBe(pattern.incorrectCount + 1);
    expect(updatedPattern.correctCount).toBe(pattern.correctCount);
  });

  it("does not require an AI provider to grade an attempt", async () => {
    const pattern = await seedPattern();
    const exercise = await prisma.exercise.create({
      data: {
        userId,
        type: "MULTIPLE_CHOICE",
        sourcePatternId: pattern.id,
        promptData: fakeGeneratedExercise(),
      },
    });

    // createExerciseAttemptService takes only { prisma } — this test's mere
    // existence (and passing) proves grading has no AI dependency.
    const service = createExerciseAttemptService({ prisma });
    const result = await service.submitAttempt(exercise.id, "1");

    expect(result.isCorrect).toBe(true);
  });
});
