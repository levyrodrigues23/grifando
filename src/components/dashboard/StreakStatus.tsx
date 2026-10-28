import { reachedMilestone, REST_DAYS_PER_WEEK, type StreakSummary } from "@/server/domain/progress/streak";

// A light nudge, not a scoreboard: no loss-aversion warnings, rest days are
// forgiven silently (docs/research/duolingo.md §3-4).
export function StreakStatus({ streak }: { streak: StreakSummary }) {
  if (streak.longest === 0) {
    return <p className="text-sm text-muted-foreground">Practice once today to start a streak.</p>;
  }

  const milestone = reachedMilestone(streak.current);

  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="font-medium">
          {streak.current}-day streak
        </span>
        <span className="text-muted-foreground"> · longest {streak.longest}</span>
        {milestone ? <span className="text-success"> · {milestone}-day milestone</span> : null}
      </p>
      <p className="text-muted-foreground">
        {streak.activeToday
          ? "Today counts already."
          : `One activity today keeps it going. Up to ${REST_DAYS_PER_WEEK} rest days a week are fine.`}
      </p>
    </div>
  );
}
