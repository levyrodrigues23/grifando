import type { PrismaClient } from "@/generated/prisma/client";
import type { AIProvider } from "@/server/ai/provider";
import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { applyExerciseResult } from "@/server/domain/mistakes/mastery";
import { evaluateExerciseAnswer } from "@/server/domain/exercises/answerChecking";
import { createExerciseAttemptRepository } from "@/server/domain/exercises/exerciseAttempt.repository";
import { createCategoryAbilityRepository } from "@/server/domain/exercises/categoryAbility.repository";
import { DEFAULT_ABILITY, targetLevel, updateAbility } from "@/server/domain/exercises/difficulty";
import { createExerciseRepository } from "@/server/domain/exercises/exercise.repository";
import { assignExerciseTypeFor } from "@/server/domain/exercises/exerciseType";
import { selectPatternsForPractice, selectReviewSet } from "@/server/domain/exercises/selection";

const DEFAULT_PRACTICE_SET_SIZE = 4;

export type SubmitAttemptResult = {
  attemptId: string;
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
  const abilities = createCategoryAbilityRepository(prisma);

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

      const ratings = await abilities.getRatings(userId);
      const targets = selected.map((pattern, index) => ({
        difficulty: targetLevel(ratings.get(pattern.category) ?? DEFAULT_ABILITY),
        type: assignExerciseTypeFor(pattern, index),
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
          difficulty: targets[index].difficulty,
        })),
      );
    },
  };
}

export function createExerciseAttemptService(deps: { prisma: PrismaClient }) {
  const { prisma } = deps;
  const patterns = createMistakePatternRepository(prisma);
  const exercises = createExerciseRepository(prisma);
  const abilities = createCategoryAbilityRepository(prisma);
  const attempts = createExerciseAttemptRepository(prisma);

  return {
    async submitAttempt(exerciseId: string, userAnswer: string): Promise<SubmitAttemptResult> {
      const exercise = await exercises.findById(exerciseId);
      if (!exercise) {
        throw new Error(`Exercise ${exerciseId} not found`);
      }

      const promptData = exercise.promptData as GeneratedExercise;
      const isCorrect = evaluateExerciseAnswer(promptData, userAnswer);

      const attempt = await attempts.create({
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
            exercise.type,
          );
          await patterns.recordAttempt(pattern.id, { ...nextState, isCorrect });

          if (exercise.difficulty !== null) {
            const ratings = await abilities.getRatings(exercise.userId);
            const ability = ratings.get(pattern.category) ?? DEFAULT_ABILITY;
            await abilities.setRating(
              exercise.userId,
              pattern.category,
              updateAbility(ability, exercise.difficulty, isCorrect),
            );
          }
        }
      }

      return { attemptId: attempt.id, isCorrect, explanation: promptData.explanation, exercise: promptData };
    },
  };
}

// "Explain my answer": an optional AI explanation of one graded attempt. It
// never changes the grade (grading stays deterministic in
// createExerciseAttemptService) and is not persisted — ExerciseAttempt.feedback
// keeps the answer key's explanation; this is shown once, on request.
export function createAttemptExplanationService(deps: { prisma: PrismaClient; aiProvider: AIProvider }) {
  const { prisma, aiProvider } = deps;
  const attempts = createExerciseAttemptRepository(prisma);

  return {
    // Returns null when the attempt doesn't exist for this user and exercise.
    async explainAttempt(input: { userId: string; exerciseId: string; attemptId: string }) {
      const attempt = await attempts.findForUser(input);
      if (!attempt) return null;

      const { explanation } = await aiProvider.explainAttempt({
        exercise: attempt.exercise.promptData as GeneratedExercise,
        userAnswer: attempt.userAnswer,
      });
      return explanation;
    },
  };
}

export type ExerciseGenerationService = ReturnType<typeof createExerciseGenerationService>;
export type ExerciseAttemptService = ReturnType<typeof createExerciseAttemptService>;
