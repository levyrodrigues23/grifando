import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";
import { prisma } from "@/server/db/client";
import { computeCategoryBreakdown } from "@/server/domain/mistakes/analytics";
import { createMistakeOccurrenceRepository } from "@/server/domain/mistakes/mistakeOccurrence.repository";
import { isFading } from "@/server/domain/mistakes/mastery";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { isDueForReview } from "@/server/domain/mistakes/recall";

const MASTERY_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  IMPROVING: "Improving",
  MASTERED: "Mastered",
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Builds a /mistakes URL keeping the other filter when one is toggled.
function mistakesHref(filters: { last30Days: boolean; fromPortuguese: boolean }): string {
  const params = new URLSearchParams();
  if (filters.last30Days) params.set("window", "30d");
  if (filters.fromPortuguese) params.set("origin", "pt");
  const query = params.toString();
  return query ? `/mistakes?${query}` : "/mistakes";
}

// Tab-style filter link: the 2px ink underline marks the active option.
function FilterTab({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 pb-2 text-sm ${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
}

function resolveSinceDate(isLast30Days: boolean): Date | undefined {
  return isLast30Days ? new Date(Date.now() - THIRTY_DAYS_MS) : undefined;
}

function getNow(): Date {
  return new Date();
}

export default async function MistakesPage(props: PageProps<"/mistakes">) {
  const searchParams = await props.searchParams;
  const isLast30Days = searchParams.window === "30d";
  const isFromPortuguese = searchParams.origin === "pt";

  const patterns = createMistakePatternRepository(prisma);
  const occurrences = createMistakeOccurrenceRepository(prisma);

  const [patternList, categoryCounts] = await Promise.all([
    patterns.listByUser(DEFAULT_USER_ID, { l1TransferOnly: isFromPortuguese }),
    occurrences.countByCategory(DEFAULT_USER_ID, { since: resolveSinceDate(isLast30Days) }),
  ]);

  const breakdown = computeCategoryBreakdown(categoryCounts);
  const now = getNow();
  const dueCount = patternList.filter((pattern) => isDueForReview(pattern, now)).length;

  return (
    <PageShell>
      <PageHeader
        title="Mistake notebook"
        description="Patterns from your writing. The same underlying mistake, however many times you make it, shows up here once."
      />

      {dueCount > 0 ? (
        <section className="mb-16 flex flex-wrap items-center justify-between gap-6 rounded-[4px] bg-linen px-6 py-8 md:px-10">
          <p className="text-heading-sm">
            {dueCount} pattern{dueCount === 1 ? " is" : "s are"} due for review.
          </p>
          {/* Practice sets are built from the most-forgotten patterns first
              (selectPatternsForPractice), so generating one there reviews these. */}
          <Button render={<Link href="/exercises">Practice due patterns</Link>} />
        </section>
      ) : null}

      <div className="grid gap-x-16 gap-y-16 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-labelledby="common-title">
          <h2 id="common-title" className="text-heading mb-6">
            Most common
          </h2>
          <nav aria-label="Time range" className="mb-6 flex gap-6">
            <FilterTab
              href={mistakesHref({ last30Days: false, fromPortuguese: isFromPortuguese })}
              active={!isLast30Days}
            >
              All time
            </FilterTab>
            <FilterTab
              href={mistakesHref({ last30Days: true, fromPortuguese: isFromPortuguese })}
              active={isLast30Days}
            >
              Last 30 days
            </FilterTab>
          </nav>
          {breakdown.length === 0 ? (
            <p className="text-muted-foreground">
              No mistakes recorded {isLast30Days ? "in the last 30 days" : "yet"}.
            </p>
          ) : (
            <ul className="border-t border-border">
              {breakdown.map((entry) => (
                <li key={entry.category} className="space-y-3 border-b border-border py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span>{MISTAKE_CATEGORY_LABELS[entry.category] ?? entry.category}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {entry.percentage}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-stone/60" aria-hidden="true">
                    <div className="h-full bg-foreground" style={{ width: `${entry.percentage}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="patterns-title">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="patterns-title" className="text-heading">
              Patterns
            </h2>
            <span className="label-mono text-muted-foreground">
              {patternList.length} {patternList.length === 1 ? "pattern" : "patterns"}
            </span>
          </div>
          <nav aria-label="Origin" className="mb-6 flex gap-6">
            <FilterTab
              href={mistakesHref({ last30Days: isLast30Days, fromPortuguese: false })}
              active={!isFromPortuguese}
            >
              All patterns
            </FilterTab>
            <FilterTab
              href={mistakesHref({ last30Days: isLast30Days, fromPortuguese: true })}
              active={isFromPortuguese}
            >
              From Portuguese
            </FilterTab>
          </nav>
          {patternList.length === 0 && isFromPortuguese ? (
            <p className="prose-serif text-lg text-iron">
              No mistakes flagged as coming from Portuguese yet.
            </p>
          ) : patternList.length === 0 ? (
            <p className="prose-serif text-lg text-iron">
              No mistakes yet.{" "}
              <Link href="/write" className="underline">
                Write something
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <ul className="border-t border-border">
              {patternList.map((pattern) => (
                <li key={pattern.id} className="space-y-3 border-b border-border py-5">
                  <p className="prose-serif text-xl leading-snug">
                    <span className="text-muted-foreground line-through decoration-1">
                      {pattern.exampleOriginal}
                    </span>{" "}
                    <span aria-hidden="true">→</span>{" "}
                    <span className="sr-only">corrected to</span>
                    <span>{pattern.exampleCorrection}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">
                      {MISTAKE_CATEGORY_LABELS[pattern.category] ?? pattern.category}
                    </Badge>
                    {isFading(pattern, now) ? (
                      <Badge variant="destructive">Fading</Badge>
                    ) : (
                      <Badge variant={pattern.masteryLevel === "MASTERED" ? "success" : "secondary"}>
                        {MASTERY_LABELS[pattern.masteryLevel]}
                      </Badge>
                    )}
                    <span className="ml-1 text-sm text-muted-foreground">
                      {pattern.occurrenceCount}× · last seen{" "}
                      {pattern.lastSeenAt.toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
