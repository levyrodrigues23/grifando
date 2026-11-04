import { recallProbability, type RecallState } from "@/server/domain/mistakes/recall";

export type SelectablePattern = RecallState & {
  id: string;
  occurrenceCount: number;
};

// Review queue: the patterns the user is most likely to have forgotten come
// first (lowest estimated recall, see recall.ts), with the most frequent
// mistake first on ties. Freshly practiced and MASTERED patterns have high
// recall, so they sink — deprioritized, never excluded (SPEC.md §5.4/§6.1).
export function selectPatternsForPractice<T extends SelectablePattern>(
  patterns: T[],
  count: number,
  now: Date,
): T[] {
  return patterns
    .map((pattern) => ({ pattern, recall: recallProbability(pattern, now) }))
    .sort((a, b) => a.recall - b.recall || b.pattern.occurrenceCount - a.pattern.occurrenceCount)
    .slice(0, count)
    .map(({ pattern }) => pattern);
}
