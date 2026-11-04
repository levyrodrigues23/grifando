import { MasteryLevel } from "@/generated/prisma/enums";
import { isDueForReview, type RecallState } from "@/server/domain/mistakes/recall";

export type MasteryState = {
  masteryLevel: MasteryLevel;
  consecutiveCorrectCount: number;
};

const REQUIRED_STREAK = 2;

// Two consecutive correct attempts promote a pattern; one failed recall drops it
// one level back toward ACTIVE (SPEC.md §6). A failed recall is an incorrect
// exercise attempt or the same mistake reappearing in writing. MASTERED is not
// terminal: a failure drops it to IMPROVING, a success keeps it MASTERED.
export function applyExerciseResult(state: MasteryState, isCorrect: boolean): MasteryState {
  if (state.masteryLevel === MasteryLevel.MASTERED) {
    return isCorrect ? state : { masteryLevel: MasteryLevel.IMPROVING, consecutiveCorrectCount: 0 };
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

// A MASTERED pattern whose estimated recall has dropped below the review
// threshold: shown as fading (effectively IMPROVING again) until it is
// practiced. Derived on read, not stored, so it needs no background job; a
// correct attempt refreshes lastPracticedAt and it stops fading.
export function isFading(pattern: MasteryState & RecallState, now: Date): boolean {
  return pattern.masteryLevel === MasteryLevel.MASTERED && isDueForReview(pattern, now);
}
