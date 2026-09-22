import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";

function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

// Deliberately simple, deterministic matching (no second AI call to grade
// free-text answers) — case/whitespace/trailing-punctuation insensitive
// against every acceptable answer the generator provided. Known tradeoff:
// a valid rephrasing the generator didn't anticipate reads as incorrect.
export function isTextAnswerAcceptable(userAnswer: string, acceptableAnswers: string[]): boolean {
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  return acceptableAnswers.some((answer) => normalizeAnswer(answer) === normalizedUserAnswer);
}

export function isMultipleChoiceCorrect(selectedIndex: number, correctOptionIndex: number): boolean {
  return selectedIndex === correctOptionIndex;
}

// Central dispatch so callers never need a type-by-type switch of their own.
export function evaluateExerciseAnswer(exercise: GeneratedExercise, userAnswer: string): boolean {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE": {
      const selectedIndex = Number.parseInt(userAnswer, 10);
      return isMultipleChoiceCorrect(selectedIndex, exercise.correctOptionIndex);
    }
    case "FILL_BLANK":
    case "REWRITE":
    case "TRANSLATION":
      return isTextAnswerAcceptable(userAnswer, exercise.acceptableAnswers);
  }
}
