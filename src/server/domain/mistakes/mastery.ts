import { MasteryLevel } from "@/generated/prisma/enums";

export type MasteryState = {
  masteryLevel: MasteryLevel;
  consecutiveCorrectCount: number;
};

const REQUIRED_STREAK = 2;

// Two consecutive correct attempts promote a pattern; one incorrect attempt on an
// IMPROVING pattern drops it back to ACTIVE; MASTERED patterns are left alone (SPEC.md §6).
export function applyExerciseResult(state: MasteryState, isCorrect: boolean): MasteryState {
  if (state.masteryLevel === MasteryLevel.MASTERED) {
    return state;
  }

  if (!isCorrect) {
    return { masteryLevel: MasteryLevel.ACTIVE, consecutiveCorrectCount: 0 };
  }

  const consecutiveCorrectCount = state.consecutiveCorrectCount + 1;

  if (consecutiveCorrectCount < REQUIRED_STREAK) {
    return { masteryLevel: state.masteryLevel, consecutiveCorrectCount };
  }

  const masteryLevel =
    state.masteryLevel === MasteryLevel.ACTIVE ? MasteryLevel.IMPROVING : MasteryLevel.MASTERED;

  return { masteryLevel, consecutiveCorrectCount: 0 };
}
