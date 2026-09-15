import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";
import { prisma } from "@/server/db/client";
import { computeCategoryBreakdown } from "@/server/domain/mistakes/analytics";
import { createMistakeOccurrenceRepository } from "@/server/domain/mistakes/mistakeOccurrence.repository";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";

const MASTERY_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  IMPROVING: "Improving",
  MASTERED: "Mastered",
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function resolveSinceDate(isLast30Days: boolean): Date | undefined {
  return isLast30Days ? new Date(Date.now() - THIRTY_DAYS_MS) : undefined;
}

export default async function MistakesPage(props: PageProps<"/mistakes">) {
  const searchParams = await props.searchParams;
  const isLast30Days = searchParams.window === "30d";

  const patterns = createMistakePatternRepository(prisma);
  const occurrences = createMistakeOccurrenceRepository(prisma);

  const [patternList, categoryCounts] = await Promise.all([
    patterns.listByUser(DEFAULT_USER_ID),
    occurrences.countByCategory(DEFAULT_USER_ID, { since: resolveSinceDate(isLast30Days) }),
  ]);

  const breakdown = computeCategoryBreakdown(categoryCounts);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mistake Notebook</h1>
        <p className="text-sm text-muted-foreground">
          Patterns from your writing sessions. The same underlying mistake, however many times
          you make it, shows up here once.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Most common mistakes</CardTitle>
          <div className="flex gap-2 text-xs">
            <Link
              href="/mistakes"
              className={isLast30Days ? "text-muted-foreground" : "font-semibold underline"}
            >
              All time
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/mistakes?window=30d"
              className={isLast30Days ? "font-semibold underline" : "text-muted-foreground"}
            >
              Last 30 days
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mistakes recorded {isLast30Days ? "in the last 30 days" : "yet"}.
            </p>
          ) : (
            <div className="space-y-3">
              {breakdown.map((entry) => (
                <div key={entry.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{MISTAKE_CATEGORY_LABELS[entry.category] ?? entry.category}</span>
                    <span className="text-muted-foreground">{entry.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {patternList.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No mistakes yet.{" "}
              <Link href="/write" className="underline">
                Write something
              </Link>{" "}
              to get started.
            </CardContent>
          </Card>
        ) : (
          patternList.map((pattern) => (
            <Card key={pattern.id} size="sm">
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {MISTAKE_CATEGORY_LABELS[pattern.category] ?? pattern.category}
                  </Badge>
                  <Badge variant={pattern.masteryLevel === "MASTERED" ? "secondary" : "default"}>
                    {MASTERY_LABELS[pattern.masteryLevel]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {pattern.occurrenceCount}x · last seen{" "}
                    {pattern.lastSeenAt.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-destructive line-through">
                    {pattern.exampleOriginal}
                  </span>
                  {" → "}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {pattern.exampleCorrection}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
