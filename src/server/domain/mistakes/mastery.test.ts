import { describe, expect, it } from "vitest";

import { MasteryLevel } from "@/generated/prisma/enums";
import { applyExerciseResult } from "@/server/domain/mistakes/mastery";

describe("applyExerciseResult", () => {
  it("keeps ACTIVE after a single correct attempt", () => {
    const result = applyExerciseResult(
      { masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 0 },
      true,
    );
    expect(result).toEqual({ masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 1 });
  });

  it("promotes ACTIVE to IMPROVING after two consecutive correct attempts", () => {
    const result = applyExerciseResult(
      { masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 1 },
      true,
    );
    expect(result).toEqual({ masteryLevel: MasteryLevel.IMPROVING, consecutiveCorrectCount: 0 });
  });

  it("promotes IMPROVING to MASTERED after two consecutive correct attempts", () => {
    const result = applyExerciseResult(
      { masteryLevel: MasteryLevel.IMPROVING, consecutiveCorrectCount: 1 },
      true,
    );
    expect(result).toEqual({ masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 });
  });

  it("drops IMPROVING back to ACTIVE on an incorrect attempt", () => {
    const result = applyExerciseResult(
      { masteryLevel: MasteryLevel.IMPROVING, consecutiveCorrectCount: 1 },
      false,
    );
    expect(result).toEqual({ masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 0 });
  });

  it("resets the streak on an incorrect attempt from ACTIVE", () => {
    const result = applyExerciseResult(
      { masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 1 },
      false,
    );
    expect(result).toEqual({ masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 0 });
  });

  it("leaves MASTERED unchanged regardless of the attempt outcome", () => {
    const correct = applyExerciseResult(
      { masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 },
      true,
    );
    const incorrect = applyExerciseResult(
      { masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 },
      false,
    );
    expect(correct).toEqual({ masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 });
    expect(incorrect).toEqual({ masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 });
  });
});
