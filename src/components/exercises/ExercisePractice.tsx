"use client";

import { useEffect, useState } from "react";

import { KeyRequiredNotice } from "@/components/settings/KeyRequiredNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseQuestion } from "@/components/exercises/ExerciseQuestion";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import type { ExerciseListItemDTO, SubmitAttemptResponse } from "@/components/exercises/types";
import { MissingAIKeyError, aiFetch } from "@/lib/aiFetch";
import { AnalyzingStatus, ButtonSpinner, EXERCISE_STEPS } from "@/components/feedback/AnalyzingStatus";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "generating" }
  | { kind: "practicing"; queue: ExerciseListItemDTO[] }
  | { kind: "result"; queue: ExerciseListItemDTO[]; exerciseId: string; result: SubmitAttemptResponse }
  | { kind: "error"; message: string; keyRequired?: boolean };

const GENERIC_ERROR = "Something went wrong. Please try again.";

// Turns an /api/exercises response into the next view state.
async function toQueueState(response: Response): Promise<State> {
  const data = await response.json();
  if (!response.ok) return { kind: "error", message: data.error ?? GENERIC_ERROR };
  const queue = (data.exercises ?? []) as ExerciseListItemDTO[];
  return queue.length > 0 ? { kind: "practicing", queue } : { kind: "empty" };
}

async function fetchPendingExercises(): Promise<State> {
  try {
    return await toQueueState(await fetch("/api/exercises"));
  } catch {
    return { kind: "error", message: GENERIC_ERROR };
  }
}

async function generateExercises(afterSessionId?: string): Promise<State> {
  try {
    const response = await aiFetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ afterSessionId }),
    });
    return await toQueueState(response);
  } catch (error) {
    return { kind: "error", message: GENERIC_ERROR, keyRequired: error instanceof MissingAIKeyError };
  }
}

// afterSessionId: the daily session's review step. Generates a fresh set that
// mixes that writing session's mistakes with due patterns, instead of resuming
// pending exercises.
export function ExercisePractice({ afterSessionId }: { afterSessionId?: string } = {}) {
  const [state, setState] = useState<State>({ kind: afterSessionId ? "generating" : "loading" });
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    let cancelled = false;
    const initial = afterSessionId ? generateExercises(afterSessionId) : fetchPendingExercises();
    void initial.then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [afterSessionId]);

  async function loadExercises() {
    setState({ kind: "loading" });
    setState(await fetchPendingExercises());
  }

  async function handleGenerate() {
    setState({ kind: "generating" });
    setState(await generateExercises(afterSessionId));
  }

  async function handleSubmit() {
    if (state.kind !== "practicing" || answer.trim().length === 0) return;
    const [current, ...rest] = state.queue;

    try {
      const response = await fetch(`/api/exercises/${current.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });

      if (!response.ok) {
        setState({ kind: "error", message: GENERIC_ERROR });
        return;
      }

      const result = (await response.json()) as SubmitAttemptResponse;
      setState({ kind: "result", queue: rest, exerciseId: current.id, result });
    } catch {
      setState({ kind: "error", message: GENERIC_ERROR });
    }
  }

  function handleNext() {
    if (state.kind !== "result") return;
    setAnswer("");
    setState(state.queue.length > 0 ? { kind: "practicing", queue: state.queue } : { kind: "empty" });
  }

  if (state.kind === "loading") {
    return (
      <p className="text-muted-foreground" aria-live="polite">
        Loading exercises...
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          {state.keyRequired ? (
            <KeyRequiredNotice />
          ) : (
            <p role="alert" className="text-destructive">{state.message}</p>
          )}
          <Button variant="outline" onClick={loadExercises}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "result") {
    return <ExerciseResult exerciseId={state.exerciseId} result={state.result} userAnswer={answer} onNext={handleNext} hasNext={state.queue.length > 0} />;
  }

  if (state.kind === "empty" || state.kind === "generating") {
    const isGenerating = state.kind === "generating";
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>No exercises to practice right now</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="prose-serif text-lg text-iron">
            Exercises are generated from mistakes found in your writing. Write something first, or
            generate a practice set from what you already have.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <ButtonSpinner /> Generating…
              </>
            ) : (
              "Generate practice set"
            )}
          </Button>
          {isGenerating ? <AnalyzingStatus steps={EXERCISE_STEPS} className="ml-4" /> : null}
        </CardFooter>
      </Card>
    );
  }

  const current = state.queue[0];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <p className="label-mono text-muted-foreground">
          {state.queue.length} left in this set
        </p>
      </CardHeader>
      <CardContent>
        <ExerciseQuestion exercise={current.prompt} answer={answer} onAnswerChange={setAnswer} />
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={answer.trim().length === 0}>
          Check answer
        </Button>
      </CardFooter>
    </Card>
  );
}
