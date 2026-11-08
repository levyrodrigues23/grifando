"use client";

import { useEffect, useState } from "react";

import { cn } from "cn";

export const WRITING_STEPS = [
  "Reading your text…",
  "Marking mistakes…",
  "Writing explanations…",
  "Almost there — long texts take up to a minute",
];

export const INTERVIEW_STEPS = [
  "Reading your answer…",
  "Marking mistakes…",
  "Thinking of the next question…",
  "Almost there — long answers take up to a minute",
];

export const EXERCISE_STEPS = [
  "Looking through your mistakes…",
  "Picking what to practice…",
  "Writing the exercises…",
  "Almost there — this can take up to a minute",
];

export const EXPLAIN_STEPS = [
  "Reading your answer…",
  "Writing the explanation…",
  "Almost there — this can take a moment",
];

const STEP_SECONDS = 6;

// Small ring for inside a busy button. Rotates only when motion is allowed.
export function ButtonSpinner() {
  return <span aria-hidden="true" className="spinner" />;
}

// A calm status line for slow AI calls: rotates through honest steps and shows
// elapsed seconds. Mount it only while a request is in flight (the timer starts
// on mount). Announced politely; the spinner is decorative.
export function AnalyzingStatus({
  steps = WRITING_STEPS,
  className,
}: {
  steps?: string[];
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const step = steps[Math.min(Math.floor(elapsed / STEP_SECONDS), steps.length - 1)];

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)}
    >
      <ButtonSpinner />
      <span key={step} className="fade-in">
        {step}
      </span>
      <span className="font-mono text-xs tabular-nums text-smoke" aria-hidden="true">
        {elapsed}s
      </span>
    </p>
  );
}
