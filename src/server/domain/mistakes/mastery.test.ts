import { describe, expect, it } from "vitest";

import { MasteryLevel } from "@/generated/prisma/enums";
import { applyExerciseResult, isFading } from "@/server/domain/mistakes/mastery";

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

  it("keeps MASTERED on a correct attempt and drops it to IMPROVING on a failure", () => {
    const correct = applyExerciseResult(
      { masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 },
      true,
    );
    const incorrect = applyExerciseResult(
      { masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 },
      false,
    );
    expect(correct).toEqual({ masteryLevel: MasteryLevel.MASTERED, consecutiveCorrectCount: 0 });
    expect(incorrect).toEqual({ masteryLevel: MasteryLevel.IMPROVING, consecutiveCorrectCount: 0 });
  });
});

describe("isFading", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date("2026-10-27T12:00:00Z");
  // correctCount 4 + incorrectCount 1 -> half-life ~11.3 days.
  const mastered = {
    masteryLevel: MasteryLevel.MASTERED,
    consecutiveCorrectCount: 0,
    correctCount: 4,
    incorrectCount: 1,
  };

  it("flags a MASTERED pattern once its recall drops below the review threshold", () => {
    expect(isFading({ ...mastered, lastPracticedAt: new Date(now.getTime() - 5 * DAY) }, now)).toBe(false);
    expect(isFading({ ...mastered, lastPracticedAt: new Date(now.getTime() - 15 * DAY) }, now)).toBe(true);
  });

  it("never flags patterns that aren't MASTERED", () => {
    const old = new Date(now.getTime() - 100 * DAY);
    expect(isFading({ ...mastered, masteryLevel: MasteryLevel.ACTIVE, lastPracticedAt: old }, now)).toBe(false);
  });
});
