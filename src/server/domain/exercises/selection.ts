import { MasteryLevel } from "@/generated/prisma/enums";
import type { MasteryLevel as MasteryLevelType } from "@/generated/prisma/enums";

export type SelectablePattern = {
  id: string;
  occurrenceCount: number;
  masteryLevel: MasteryLevelType;
};

const MASTERY_WEIGHT: Record<MasteryLevelType, number> = {
  [MasteryLevel.ACTIVE]: 2,
  [MasteryLevel.IMPROVING]: 1,
  [MasteryLevel.MASTERED]: 0,
};

// Prioritizes high-frequency, low-mastery patterns for practice; MASTERED
// patterns are deprioritized, not excluded (SPEC.md §5.4/§6).
export function selectPatternsForPractice<T extends SelectablePattern>(
  patterns: T[],
  count: number,
): T[] {
  return [...patterns]
    .sort((a, b) => {
      const weightDiff = MASTERY_WEIGHT[b.masteryLevel] - MASTERY_WEIGHT[a.masteryLevel];
      if (weightDiff !== 0) return weightDiff;
      return b.occurrenceCount - a.occurrenceCount;
    })
    .slice(0, count);
}
