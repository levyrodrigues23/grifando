"use client";

import { useState } from "react";

import { ExercisePractice } from "@/components/exercises/ExercisePractice";
import { WritingCoach, type InitialChallenge } from "@/components/writing/WritingCoach";

type Step = { kind: "write" } | { kind: "review"; sessionId: string };

// The daily session (docs/research/duolingo.md §2.3): write today's challenge,
// then review — a practice set that interleaves the mistakes just made with the
// patterns most due for review. One page, no navigation in between.
export function TodaySession({ challenge }: { challenge: InitialChallenge }) {
  const [step, setStep] = useState<Step>({ kind: "write" });

  return (
    <div className="space-y-6">
      <ol className="flex gap-4 text-xs font-medium tracking-normal uppercase">
        <li className={step.kind === "write" ? "text-foreground" : "text-muted-foreground"}>1. Write</li>
        <li className={step.kind === "review" ? "text-foreground" : "text-muted-foreground"}>2. Review</li>
      </ol>

      {step.kind === "write" ? (
        <WritingCoach
          initialChallenge={challenge}
          nextStep={{
            label: "Continue to review",
            onClick: (sessionId) => setStep({ kind: "review", sessionId }),
          }}
        />
      ) : (
        <ExercisePractice afterSessionId={step.sessionId} />
      )}
    </div>
  );
}
