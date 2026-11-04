import { ExerciseType } from "@/generated/prisma/enums";
import { type MasteryState, needsMasteryCheck } from "@/server/domain/mistakes/mastery";

const ROTATION = [
  ExerciseType.MULTIPLE_CHOICE,
  ExerciseType.FILL_BLANK,
  ExerciseType.REWRITE,
  ExerciseType.TRANSLATION,
] as const;

// Cycles deterministically through the four exercise types rather than
// letting the model choose, so a practice set stays varied and predictable.
export function assignExerciseType(index: number): ExerciseType {
  return ROTATION[index % ROTATION.length];
}

const MASTERY_CHECK_ROTATION = [ExerciseType.REWRITE, ExerciseType.TRANSLATION] as const;

// A pattern one step from MASTERED gets its unscaffolded mastery check
// (REWRITE or TRANSLATION); every other pattern follows the normal rotation.
export function assignExerciseTypeFor(pattern: MasteryState, index: number): ExerciseType {
  return needsMasteryCheck(pattern)
    ? MASTERY_CHECK_ROTATION[index % MASTERY_CHECK_ROTATION.length]
    : assignExerciseType(index);
}
