import { describe, expect, it } from "vitest";

import { ExerciseType } from "@/generated/prisma/enums";
import { assignExerciseType } from "@/server/domain/exercises/exerciseType";

describe("assignExerciseType", () => {
  it("cycles through all four types in order", () => {
    expect([0, 1, 2, 3].map(assignExerciseType)).toEqual([
      ExerciseType.MULTIPLE_CHOICE,
      ExerciseType.FILL_BLANK,
      ExerciseType.REWRITE,
      ExerciseType.TRANSLATION,
    ]);
  });

  it("wraps around after the fourth index", () => {
    expect(assignExerciseType(4)).toBe(ExerciseType.MULTIPLE_CHOICE);
    expect(assignExerciseType(5)).toBe(ExerciseType.FILL_BLANK);
  });
});
