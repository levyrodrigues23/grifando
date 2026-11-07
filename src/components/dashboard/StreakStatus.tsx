import { reachedMilestone, REST_DAYS_PER_WEEK, type StreakSummary } from "@/server/domain/progress/streak";

// A light nudge, not a scoreboard: no loss-aversion warnings, rest days are
// forgiven silently (docs/research/duolingo.md §3-4).
export function StreakStatus({ streak }: { streak: StreakSummary }) {
  if (streak.longest === 0) {
    return (
      <p className="prose-serif text-lg text-iron">Practice once today to start a streak.</p>
    );
  }

  const milestone = reachedMilestone(streak.current);

  return (
    <div className="space-y-2">
      <p className="text-heading-sm">
        {streak.current}-day streak
        <span className="text-muted-foreground"> · longest {streak.longest}</span>
      </p>
      {milestone ? <p className="text-sm text-success">{milestone}-day milestone reached</p> : null}
      <p className="prose-serif text-lg text-iron">
        {streak.activeToday
          ? "Today counts already."
          : `One activity today keeps it going. Up to ${REST_DAYS_PER_WEEK} rest days a week are fine.`}
      </p>
    </div>
  );
}
