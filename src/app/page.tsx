import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressSummary } from "@/components/dashboard/ProgressSummary";
import { RecentMistakes } from "@/components/dashboard/RecentMistakes";
import { RecentWriting } from "@/components/dashboard/RecentWriting";
import { WeakAreas } from "@/components/dashboard/WeakAreas";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";
import { prisma } from "@/server/db/client";
import { computeCategoryBreakdown } from "@/server/domain/mistakes/analytics";
import { createMistakeOccurrenceRepository } from "@/server/domain/mistakes/mistakeOccurrence.repository";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { isDueForReview } from "@/server/domain/mistakes/recall";
import { createExerciseAttemptRepository } from "@/server/domain/exercises/exerciseAttempt.repository";
import { selectPatternsForPractice } from "@/server/domain/exercises/selection";
import { computeAverageScores } from "@/server/domain/progress/progress";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  getTodaysDate,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";

const RECENT_LIMIT = 3;
const SCORE_TREND_LIMIT = 10;

// Reads live, per-request data (mistake patterns, today's date) — must never
// be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const patterns = createMistakePatternRepository(prisma);
  const occurrences = createMistakeOccurrenceRepository(prisma);
  const sessions = createWritingSessionRepository(prisma);
  const attempts = createExerciseAttemptRepository(prisma);

  const [
    userPatterns,
    categoryCounts,
    recentPatterns,
    recentAnalyzedSessions,
    writingSessionsCompleted,
    exercisesCompleted,
  ] = await Promise.all([
    patterns.listByUser(DEFAULT_USER_ID),
    occurrences.countByCategory(DEFAULT_USER_ID),
    patterns.listRecentByUser(DEFAULT_USER_ID, { limit: RECENT_LIMIT }),
    sessions.listRecentAnalyzed(DEFAULT_USER_ID, { limit: SCORE_TREND_LIMIT }),
    sessions.countAnalyzed(DEFAULT_USER_ID),
    attempts.countByUser(DEFAULT_USER_ID),
  ]);

  const weakCategories = extractActiveWeakCategories(userPatterns);
  const now = getTodaysDate();
  const dailyPrompt = selectDailyPrompt(DAILY_PROMPTS, now, weakCategories);
  const breakdown = computeCategoryBreakdown(categoryCounts);
  const [recommendation] = selectPatternsForPractice(userPatterns, 1, now);
  const dueCount = userPatterns.filter((pattern) => isDueForReview(pattern, now)).length;
  const averageScores = computeAverageScores(
    recentAnalyzedSessions.flatMap((session) => (session.analysis ? [session.analysis] : [])),
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-4xl leading-[0.9] font-medium tracking-normal uppercase sm:text-5xl">
          Inglesando
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Write something in English and get structured feedback built from your own mistakes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{dailyPrompt.text}</p>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" render={<Link href="/write">Write freely instead</Link>} />
          <Button render={<Link href="/write?mode=daily">Write your answer</Link>} />
        </CardFooter>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressSummary
              writingSessionsCompleted={writingSessionsCompleted}
              exercisesCompleted={exercisesCompleted}
              averageScores={averageScores}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weak areas</CardTitle>
          </CardHeader>
          <CardContent>
            <WeakAreas breakdown={breakdown} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Practice recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dueCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {dueCount} pattern{dueCount === 1 ? " is" : "s are"} due for review — you&apos;re likely
              to be forgetting {dueCount === 1 ? "it" : "them"}.
            </p>
          ) : null}
          {recommendation ? (
            <p className="text-sm">
              You&apos;ve mixed up{" "}
              <span className="font-medium">
                {MISTAKE_CATEGORY_LABELS[recommendation.category] ?? recommendation.category}
              </span>{" "}
              {recommendation.occurrenceCount} time
              {recommendation.occurrenceCount === 1 ? "" : "s"}: &ldquo;
              <span className="text-destructive line-through">
                {recommendation.exampleOriginal}
              </span>
              &rdquo; should be &ldquo;
              <span className="text-success">{recommendation.exampleCorrection}</span>
              &rdquo;. Practice it now.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Write something first — exercises are generated from mistakes found in your own
              writing.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button render={<Link href="/exercises">Go to exercises</Link>} />
        </CardFooter>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent mistakes</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentMistakes patterns={recentPatterns} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent writing</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentWriting sessions={recentAnalyzedSessions.slice(0, RECENT_LIMIT)} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
