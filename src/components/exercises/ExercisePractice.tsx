"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseQuestion } from "@/components/exercises/ExerciseQuestion";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import type { ExerciseListItemDTO, SubmitAttemptResponse } from "@/components/exercises/types";

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "generating" }
  | { kind: "practicing"; queue: ExerciseListItemDTO[] }
  | { kind: "result"; queue: ExerciseListItemDTO[]; result: SubmitAttemptResponse }
  | { kind: "error"; message: string };

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function ExercisePractice() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/exercises");
      const data = await response.json();

      if (!response.ok) {
        setState({ kind: "error", message: data.error ?? GENERIC_ERROR });
        return;
      }

      const queue = (data.exercises ?? []) as ExerciseListItemDTO[];
      setState(queue.length > 0 ? { kind: "practicing", queue } : { kind: "empty" });
    } catch {
      setState({ kind: "error", message: GENERIC_ERROR });
    }
  }

  async function handleGenerate() {
    setState({ kind: "generating" });
    try {
      const response = await fetch("/api/exercises", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setState({ kind: "error", message: data.error ?? GENERIC_ERROR });
        return;
      }

      const queue = (data.exercises ?? []) as ExerciseListItemDTO[];
      setState(queue.length > 0 ? { kind: "practicing", queue } : { kind: "empty" });
    } catch {
      setState({ kind: "error", message: GENERIC_ERROR });
    }
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
      setState({ kind: "result", queue: rest, result });
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
    return <p className="text-sm text-muted-foreground">Loading exercises...</p>;
  }

  if (state.kind === "error") {
    return (
      <Card>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button variant="outline" onClick={loadExercises}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "result") {
    return <ExerciseResult result={state.result} userAnswer={answer} onNext={handleNext} hasNext={state.queue.length > 0} />;
  }

  if (state.kind === "empty" || state.kind === "generating") {
    const isGenerating = state.kind === "generating";
    return (
      <Card>
        <CardHeader>
          <CardTitle>No exercises to practice right now</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Exercises are generated from mistakes found in your writing. Write something first, or
            generate a practice set from what you already have.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate practice set"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const current = state.queue[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice</CardTitle>
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
