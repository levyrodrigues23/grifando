"use client";

import { useState } from "react";

import { ExercisePractice } from "@/components/exercises/ExercisePractice";
import { WritingCoach, type InitialChallenge } from "@/components/writing/WritingCoach";

type Step = { kind: "write" } | { kind: "review"; sessionId: string };

// The daily session: write today's challenge,
// then review — a practice set that interleaves the mistakes just made with the
// patterns most due for review. One page, no navigation in between.
export function TodaySession({ challenge }: { challenge: InitialChallenge }) {
  const [step, setStep] = useState<Step>({ kind: "write" });

  return (
    <div className="space-y-10">
      <ol className="flex gap-7" aria-label="Session steps">
        {(["write", "review"] as const).map((kind, index) => (
          <li
            key={kind}
            aria-current={step.kind === kind ? "step" : undefined}
            className={`border-b-2 pb-2 text-sm ${step.kind === kind ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            <span className="font-mono text-xs">{index + 1}</span> {kind === "write" ? "Write" : "Review"}
          </li>
        ))}
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
