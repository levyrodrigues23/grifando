import { ExerciseType } from "@/generated/prisma/enums";

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
