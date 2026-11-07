import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";
import type { CategoryBreakdownEntry } from "@/server/domain/mistakes/analytics";

const MAX_CATEGORIES = 4;

export function WeakAreas({ breakdown }: { breakdown: CategoryBreakdownEntry[] }) {
  if (breakdown.length === 0) {
    return (
      <p className="prose-serif text-lg text-iron">
        No weak areas yet — write something to get started.
      </p>
    );
  }

  return (
    <ul className="border-t border-border">
      {breakdown.slice(0, MAX_CATEGORIES).map((entry) => (
        <li key={entry.category} className="space-y-3 border-b border-border py-4">
          <div className="flex items-baseline justify-between gap-4">
            <span>{MISTAKE_CATEGORY_LABELS[entry.category] ?? entry.category}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {entry.percentage}% of mistakes
            </span>
          </div>
          <div className="h-1 w-full bg-stone/60" aria-hidden="true">
            <div className="h-full bg-foreground" style={{ width: `${entry.percentage}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
