import { z } from "zod";

import { AIResponseValidationError } from "@/server/ai/errors";

const baseFields = {
  instruction: z.string().min(1).max(300),
  explanation: z.string().min(1).max(1000),
};

export const multipleChoiceExerciseSchema = z.object({
  type: z.literal("MULTIPLE_CHOICE"),
  ...baseFields,
  options: z.array(z.string().min(1).max(300)).min(2).max(5),
  correctOptionIndex: z.number().int().min(0),
});

export const fillBlankExerciseSchema = z.object({
  type: z.literal("FILL_BLANK"),
  ...baseFields,
  template: z.string().min(1).max(300),
  acceptableAnswers: z.array(z.string().min(1).max(100)).min(1).max(5),
});

export const rewriteExerciseSchema = z.object({
  type: z.literal("REWRITE"),
  ...baseFields,
  original: z.string().min(1).max(500),
  acceptableAnswers: z.array(z.string().min(1).max(500)).min(1).max(3),
});

export const translationExerciseSchema = z.object({
  type: z.literal("TRANSLATION"),
  ...baseFields,
  sourceText: z.string().min(1).max(500),
  acceptableAnswers: z.array(z.string().min(1).max(500)).min(1).max(3),
});

export const generatedExerciseSchema = z.discriminatedUnion("type", [
  multipleChoiceExerciseSchema,
  fillBlankExerciseSchema,
  rewriteExerciseSchema,
  translationExerciseSchema,
]);

export const exerciseGenerationResultSchema = z.object({
  exercises: z.array(generatedExerciseSchema).min(1).max(10),
});

export type GeneratedExercise = z.infer<typeof generatedExerciseSchema>;
export type ExerciseGenerationResult = z.infer<typeof exerciseGenerationResultSchema>;

// Provider-agnostic business rules on top of schema validity — shared by
// every AIProvider implementation so they don't each reimplement these checks.
export function validateExerciseGenerationResult(
  result: ExerciseGenerationResult,
  targetCount: number,
): GeneratedExercise[] {
  if (result.exercises.length !== targetCount) {
    throw new AIResponseValidationError(
      `Expected ${targetCount} exercises, got ${result.exercises.length}`,
      [],
    );
  }

  const invalidMultipleChoice = result.exercises.find(
    (exercise) =>
      exercise.type === "MULTIPLE_CHOICE" && exercise.correctOptionIndex >= exercise.options.length,
  );

  if (invalidMultipleChoice) {
    throw new AIResponseValidationError(
      "A multiple-choice exercise's correctOptionIndex is out of range",
      [],
    );
  }

  return result.exercises;
}
