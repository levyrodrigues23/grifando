import type { PrismaClient } from "@/generated/prisma/client";
import type { AIProvider } from "@/server/ai/provider";
import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { applyExerciseResult } from "@/server/domain/mistakes/mastery";
import { evaluateExerciseAnswer } from "@/server/domain/exercises/answerChecking";
import { createExerciseAttemptRepository } from "@/server/domain/exercises/exerciseAttempt.repository";
import { createExerciseRepository } from "@/server/domain/exercises/exercise.repository";
import { assignExerciseType } from "@/server/domain/exercises/exerciseType";
import { selectPatternsForPractice, selectReviewSet } from "@/server/domain/exercises/selection";

const DEFAULT_PRACTICE_SET_SIZE = 4;

export type SubmitAttemptResult = {
  isCorrect: boolean;
  explanation: string;
  exercise: GeneratedExercise;
};

// Generation needs the AI provider; grading an attempt is fully deterministic
// and does not. Kept as two services so submitting an attempt never depends
// on ANTHROPIC_API_KEY being configured.
export function createExerciseGenerationService(deps: { prisma: PrismaClient; aiProvider: AIProvider }) {
  const { prisma, aiProvider } = deps;
  const patterns = createMistakePatternRepository(prisma);
  const exercises = createExerciseRepository(prisma);

  return {
    // Builds a practice set from the user's actual weak patterns — never
    // generic, random English exercises (SPEC.md §5.4).
    // With afterSessionId (the daily session), the mistakes from that writing
    // session are interleaved with the most-due older patterns.
    async generatePracticeSet(
      userId: string,
      count = DEFAULT_PRACTICE_SET_SIZE,
      options: { afterSessionId?: string } = {},
    ) {
      const allPatterns = await patterns.listByUser(userId);
      const now = new Date();
      const selected = options.afterSessionId
        ? selectReviewSet(
            allPatterns,
            count,
            now,
            await patterns.listIdsForSession(options.afterSessionId, userId),
          )
        : selectPatternsForPractice(allPatterns, count, now);

      if (selected.length === 0) {
        return [];
      }

      const targets = selected.map((pattern, index) => ({
        type: assignExerciseType(index),
        category: pattern.category,
        exampleOriginal: pattern.exampleOriginal,
        exampleCorrection: pattern.exampleCorrection,
      }));

      const generated = await aiProvider.generateExercises(targets);

      return exercises.createMany(
        generated.map((item, index) => ({
          userId,
          type: item.type,
          sourcePatternId: selected[index].id,
          promptData: item,
        })),
      );
    },
  };
}

export function createExerciseAttemptService(deps: { prisma: PrismaClient }) {
  const { prisma } = deps;
  const patterns = createMistakePatternRepository(prisma);
  const exercises = createExerciseRepository(prisma);
  const attempts = createExerciseAttemptRepository(prisma);

  return {
    async submitAttempt(exerciseId: string, userAnswer: string): Promise<SubmitAttemptResult> {
      const exercise = await exercises.findById(exerciseId);
      if (!exercise) {
        throw new Error(`Exercise ${exerciseId} not found`);
      }

      const promptData = exercise.promptData as GeneratedExercise;
      const isCorrect = evaluateExerciseAnswer(promptData, userAnswer);

      await attempts.create({
        exerciseId,
        userAnswer,
        isCorrect,
        feedback: promptData.explanation,
      });

      if (exercise.sourcePatternId) {
        const pattern = await patterns.findById(exercise.sourcePatternId);
        if (pattern) {
          const nextState = applyExerciseResult(
            {
              masteryLevel: pattern.masteryLevel,
              consecutiveCorrectCount: pattern.consecutiveCorrectCount,
            },
            isCorrect,
          );
          await patterns.recordAttempt(pattern.id, { ...nextState, isCorrect });
        }
      }

      return { isCorrect, explanation: promptData.explanation, exercise: promptData };
    },
  };
}

export type ExerciseGenerationService = ReturnType<typeof createExerciseGenerationService>;
export type ExerciseAttemptService = ReturnType<typeof createExerciseAttemptService>;
