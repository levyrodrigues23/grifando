import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  PageShell,
  Section,
  SectionTitle,
} from "@/components/layout/PageHeader";
import { ProgressSummary } from "@/components/dashboard/ProgressSummary";
import { RecentMistakes } from "@/components/dashboard/RecentMistakes";
import { RecentWriting } from "@/components/dashboard/RecentWriting";
import { Reveal } from "@/components/motion/Reveal";
import { HeroNote } from "@/components/home/HeroNote";
import { LiveSpecimen } from "@/components/home/LiveSpecimen";
import { StreakStatus } from "@/components/dashboard/StreakStatus";
import { WeakAreas } from "@/components/dashboard/WeakAreas";
import { MISTAKE_CATEGORY_LABELS } from "@/lib/mistakeCategoryLabels";
import { prisma } from "@/server/db/client";
import { computeCategoryBreakdown } from "@/server/domain/mistakes/analytics";
import { createMistakeOccurrenceRepository } from "@/server/domain/mistakes/mistakeOccurrence.repository";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { isDueForReview } from "@/server/domain/mistakes/recall";
import { createExerciseAttemptRepository } from "@/server/domain/exercises/exerciseAttempt.repository";
import { selectPatternsForPractice } from "@/server/domain/exercises/selection";
import { computeAverageScores } from "@/server/domain/progress/progress";
import { computeStreak } from "@/server/domain/progress/streak";
import {
  DAILY_PROMPTS,
  extractActiveWeakCategories,
  getTodaysDate,
  selectDailyPrompt,
} from "@/server/domain/writing/dailyPrompt";
import { createWritingSessionRepository } from "@/server/domain/writing/writingSession.repository";
import { getCurrentUserId } from "@/server/session/currentUser";

const RECENT_LIMIT = 3;
const SCORE_TREND_LIMIT = 10;
const ACCURACY_WINDOW = 50;

// Reads live, per-request data (mistake patterns, today's date) — must never
// be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getCurrentUserId();
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
    writingDates,
    attemptDates,
    exerciseAccuracy,
  ] = await Promise.all([
    patterns.listByUser(userId),
    occurrences.countByCategory(userId),
    patterns.listRecentByUser(userId, { limit: RECENT_LIMIT }),
    sessions.listRecentAnalyzed(userId, { limit: SCORE_TREND_LIMIT }),
    sessions.countAnalyzed(userId),
    attempts.countByUser(userId),
    sessions.listAnalyzedDates(userId),
    attempts.listAttemptDates(userId),
    attempts.recentAccuracy(userId, { limit: ACCURACY_WINDOW }),
  ]);

  const weakCategories = extractActiveWeakCategories(userPatterns);
  const now = getTodaysDate();
  const dailyPrompt = selectDailyPrompt(DAILY_PROMPTS, now, weakCategories);
  const breakdown = computeCategoryBreakdown(categoryCounts);
  const [recommendation] = selectPatternsForPractice(userPatterns, 1, now);
  const dueCount = userPatterns.filter((pattern) =>
    isDueForReview(pattern, now),
  ).length;
  // Days follow the server's local time zone (the app runs on the learner's machine).
  const streak = computeStreak([...writingDates, ...attemptDates], now);
  const averageScores = computeAverageScores(
    recentAnalyzedSessions.flatMap((session) =>
      session.analysis ? [session.analysis] : [],
    ),
  );

  const promptIsLong = dailyPrompt.text.length > 110;

  return (
    <PageShell>
      <header className="grid gap-x-16 gap-y-8 pt-12 pb-10 md:pt-20 md:pb-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
        <h1 className="text-display-lg rise-in max-w-[14ch]">
          Learn English from the mistakes you actually make.
        </h1>
        <div className="rise-in space-y-6 lg:pb-1" style={{ animationDelay: "80ms" }}>
          <p className="prose-serif text-lg text-iron">
            Write anything. Inglesando marks each slip, explains it, and turns it into practice
            built from your own writing.
          </p>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="lg" render={<Link href="/write">Proof your own writing</Link>} />
              <Button
                size="lg"
                variant="ghost"
                render={<Link href="/today">Today&apos;s session</Link>}
              />
            </div>
            <HeroNote>your own mistakes, not generic drills</HeroNote>
          </div>
        </div>
      </header>

      <Section className="pb-16 md:pb-24">
        <LiveSpecimen />
      </Section>

      <Section className="pb-16 md:pb-24">
        <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="space-y-5">
            <p className="label-mono text-muted-foreground">Today&apos;s challenge</p>
            <h2
              className={
                promptIsLong
                  ? "text-heading-lg max-w-[24ch]"
                  : "text-display max-w-[18ch]"
              }
            >
              {dailyPrompt.text}
            </h2>
          </div>
          <div className="space-y-6">
            <StreakStatus streak={streak} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                render={<Link href="/today">Start today&apos;s session</Link>}
              />
              <Button
                variant="ghost"
                render={<Link href="/write">Write freely</Link>}
              />
            </div>
          </div>
        </div>
      </Section>

      <Reveal>
        <Section tone="linen">
          <SectionTitle
            aside={
              <span className="label-mono text-muted-foreground">
                Heuristic AI scores
              </span>
            }
          >
            Progress
          </SectionTitle>
          <ProgressSummary
            writingSessionsCompleted={writingSessionsCompleted}
            exercisesCompleted={exercisesCompleted}
            exerciseAccuracy={exerciseAccuracy}
            averageScores={averageScores}
          />
        </Section>
      </Reveal>

      <div className="grid gap-x-16 gap-y-16 pt-20 md:pt-24 lg:grid-cols-2">
        <Reveal>
          <section>
            <SectionTitle>Practice next</SectionTitle>
            <div className="space-y-4">
              {dueCount > 0 ? (
                <p className="text-iron">
                  {dueCount} pattern{dueCount === 1 ? " is" : "s are"} due for
                  review — you&apos;re likely to be forgetting{" "}
                  {dueCount === 1 ? "it" : "them"}.
                </p>
              ) : null}
              {recommendation ? (
                <>
                  <p className="text-iron">
                    You&apos;ve mixed up{" "}
                    {MISTAKE_CATEGORY_LABELS[recommendation.category] ??
                      recommendation.category}{" "}
                    {recommendation.occurrenceCount} time
                    {recommendation.occurrenceCount === 1 ? "" : "s"}.
                  </p>
                  <p className="prose-serif text-2xl leading-snug">
                    <span className="text-muted-foreground line-through decoration-1">
                      {recommendation.exampleOriginal}
                    </span>{" "}
                    <span aria-hidden="true">→</span>{" "}
                    <span className="sr-only">should be</span>
                    <span>{recommendation.exampleCorrection}</span>
                  </p>
                </>
              ) : (
                <p className="prose-serif text-lg text-iron">
                  Write something first — exercises are generated from mistakes
                  found in your own writing.
                </p>
              )}
              <div className="pt-2">
                <Button
                  variant="outline"
                  render={<Link href="/exercises">Go to exercises</Link>}
                />
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <SectionTitle>Weak areas</SectionTitle>
            <WeakAreas breakdown={breakdown} />
          </section>
        </Reveal>

        <Reveal>
          <section>
            <SectionTitle
              aside={
                <Link href="/mistakes" className="text-sm underline">
                  All mistakes
                </Link>
              }
            >
              Recent mistakes
            </SectionTitle>
            <RecentMistakes patterns={recentPatterns} />
          </section>
        </Reveal>

        <Reveal>
          <section>
            <SectionTitle>Recent writing</SectionTitle>
            <RecentWriting
              sessions={recentAnalyzedSessions.slice(0, RECENT_LIMIT)}
            />
          </section>
        </Reveal>
      </div>
    </PageShell>
  );
}
