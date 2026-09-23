import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";
import type { CategoryBreakdownEntry } from "@/server/domain/mistakes/analytics";

const MAX_CATEGORIES = 3;

export function WeakAreas({ breakdown }: { breakdown: CategoryBreakdownEntry[] }) {
  if (breakdown.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No weak areas yet — write something to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {breakdown.slice(0, MAX_CATEGORIES).map((entry) => (
        <div key={entry.category} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{MISTAKE_CATEGORY_LABELS[entry.category] ?? entry.category}</span>
            <span className="text-muted-foreground">{entry.percentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-ember"
              style={{ width: `${entry.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
