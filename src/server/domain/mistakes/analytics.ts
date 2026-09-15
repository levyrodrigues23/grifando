import type { MistakeCategory } from "@/generated/prisma/enums";

export type CategoryCount = { category: MistakeCategory; count: number };
export type CategoryBreakdownEntry = CategoryCount & { percentage: number };

// Turns raw per-category counts into a sorted, percentage-labeled breakdown
// for the Mistake Notebook (SPEC.md §5.3) — deliberately simple, no BI layer.
export function computeCategoryBreakdown(counts: CategoryCount[]): CategoryBreakdownEntry[] {
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);

  return counts
    .map((entry) => ({
      ...entry,
      percentage: total === 0 ? 0 : Math.round((entry.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}
