import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MasteryLevel, MistakeCategory } from "@/generated/prisma/enums";
import type { AIProvider } from "@/server/ai/provider";
import { createTestPrismaClient, resetDatabase } from "@/server/db/test-utils";
import { NotFoundError } from "@/server/domain/errors";
import {
  createAttemptExplanationService,
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
    const aiProvider: AIProvider = { analyzeWriting: vi.fn(), generateExercises: vi.fn(), continueInterview: vi.fn(), explainAttempt: vi.fn() };
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
      explainAttempt: vi.fn(),
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

    const result = await service.submitAttempt(userId, exercise.id, "1");

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

    const result = await service.submitAttempt(userId, exercise.id, "0");

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
    const result = await service.submitAttempt(userId, exercise.id, "1");

    expect(result.isCorrect).toBe(true);
  });
});

describe("attemptExplanationService.explainAttempt", () => {
  it("explains a graded attempt without changing it", async () => {
    const pattern = await seedPattern();
    const exercise = await prisma.exercise.create({
      data: { userId, type: "MULTIPLE_CHOICE", sourcePatternId: pattern.id, promptData: fakeGeneratedExercise() },
    });
    const graded = await createExerciseAttemptService({ prisma }).submitAttempt(userId, exercise.id, "0");
    const explainAttempt = vi.fn().mockResolvedValue({ explanation: "You picked the wrong preposition." });
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn(),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
      explainAttempt,
    };
    const service = createAttemptExplanationService({ prisma, aiProvider });

    const explanation = await service.explainAttempt({ userId, exerciseId: exercise.id, attemptId: graded.attemptId });

    expect(explanation).toBe("You picked the wrong preposition.");
    expect(explainAttempt).toHaveBeenCalledWith(expect.objectContaining({ userAnswer: "0" }));
    const attempt = await prisma.exerciseAttempt.findUniqueOrThrow({ where: { id: graded.attemptId } });
    expect(attempt.isCorrect).toBe(false);
  });

  it("returns null for an attempt that isn't the user's on that exercise", async () => {
    const aiProvider: AIProvider = {
      analyzeWriting: vi.fn(),
      generateExercises: vi.fn(),
      continueInterview: vi.fn(),
      explainAttempt: vi.fn(),
    };
    const service = createAttemptExplanationService({ prisma, aiProvider });

    expect(await service.explainAttempt({ userId, exerciseId: "nope", attemptId: "nope" })).toBeNull();
    expect(aiProvider.explainAttempt).not.toHaveBeenCalled();
  });
});

describe("difficulty targeting", () => {
  it("raises the category ability after a correct attempt on a rated exercise", async () => {
    const pattern = await seedPattern();
    const exercise = await prisma.exercise.create({
      data: {
        userId,
        type: "MULTIPLE_CHOICE",
        sourcePatternId: pattern.id,
        promptData: fakeGeneratedExercise(),
        difficulty: 3,
      },
    });

    await createExerciseAttemptService({ prisma }).submitAttempt(userId, exercise.id, "1");

    const ability = await prisma.categoryAbility.findUniqueOrThrow({
      where: { userId_category: { userId, category: pattern.category } },
    });
    expect(ability.rating).toBeGreaterThan(1000);
    expect(ability.attemptCount).toBe(1);
  });

  it("asks the generator for a difficulty and stores it on the exercise", async () => {
    await seedPattern();
    const generateExercises = vi.fn().mockResolvedValue([fakeGeneratedExercise()]);
    const aiProvider = {
      analyzeWriting: vi.fn(),
      generateExercises,
      continueInterview: vi.fn(),
    } as unknown as AIProvider;

    const [created] = await createExerciseGenerationService({ prisma, aiProvider }).generatePracticeSet(userId, 1);

    const [targets] = generateExercises.mock.calls[0];
    expect(targets[0].difficulty).toBeGreaterThanOrEqual(1);
    expect(targets[0].difficulty).toBeLessThanOrEqual(5);
    expect(created.difficulty).toBe(targets[0].difficulty);
  });
});

describe("exerciseAttemptService ownership", () => {
  it("rejects another user's exercise and leaves the owner's data untouched", async () => {
    const pattern = await seedPattern({ masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 1 });
    const exercise = await prisma.exercise.create({
      data: { userId, type: "MULTIPLE_CHOICE", sourcePatternId: pattern.id, promptData: fakeGeneratedExercise() },
    });
    await prisma.user.create({ data: { id: "intruder" } });

    await expect(
      createExerciseAttemptService({ prisma }).submitAttempt("intruder", exercise.id, "1"),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await prisma.exerciseAttempt.count()).toBe(0);
    const after = await prisma.mistakePattern.findUniqueOrThrow({ where: { id: pattern.id } });
    expect(after.consecutiveCorrectCount).toBe(1);
    expect(after.masteryLevel).toBe(MasteryLevel.ACTIVE);
  });
});
