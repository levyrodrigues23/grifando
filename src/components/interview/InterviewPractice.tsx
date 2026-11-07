"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WritingSheet } from "@/components/writing/WritingSheet";
import { TurnFeedback } from "@/components/interview/TurnFeedback";
import type {
  AnswerTurnResponse,
  CompletedTurn,
  InterviewTurnRef,
  StartInterviewResponse,
} from "@/components/interview/types";
import { errorMessageFor } from "@/lib/responseError";

const MAX_LENGTH = 5000;
const GENERIC_ERROR = "Something went wrong. Please try again.";

type State =
  | { kind: "idle"; errorMessage?: string }
  | { kind: "starting" }
  | {
      kind: "active";
      sessionId: string;
      currentTurn: InterviewTurnRef;
      history: CompletedTurn[];
      errorMessage?: string;
    }
  | { kind: "submitting"; sessionId: string; currentTurn: InterviewTurnRef; history: CompletedTurn[] }
  | { kind: "ended"; history: CompletedTurn[] };

export function InterviewPractice() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [answer, setAnswer] = useState("");
  // Writing session of the last failed attempt at the current turn, so a
  // resubmit re-analyzes it instead of creating a duplicate.
  const [failedSessionId, setFailedSessionId] = useState<string>();

  async function handleStart() {
    setState({ kind: "starting" });

    try {
      const response = await fetch("/api/interview", { method: "POST" });
      if (!response.ok) {
        setState({ kind: "idle", errorMessage: await errorMessageFor(response, GENERIC_ERROR) });
        return;
      }

      const data = (await response.json()) as StartInterviewResponse;
      setState({ kind: "active", sessionId: data.sessionId, currentTurn: data.turn, history: [] });
    } catch {
      setState({ kind: "idle", errorMessage: GENERIC_ERROR });
    }
  }

  async function handleSubmit() {
    if (state.kind !== "active") return;
    const { sessionId, currentTurn, history } = state;

    setState({ kind: "submitting", sessionId, currentTurn, history });

    try {
      const response = await fetch(
        `/api/interview/${sessionId}/turns/${currentTurn.id}/answer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer, retrySessionId: failedSessionId }),
        },
      );

      if (!response.ok) {
        const errorMessage = await errorMessageFor(response, GENERIC_ERROR);
        setState({ kind: "active", sessionId, currentTurn, history, errorMessage });
        return;
      }

      const result = (await response.json()) as AnswerTurnResponse;

      if (result.status === "failed") {
        setFailedSessionId(result.sessionId);
        setState({ kind: "active", sessionId, currentTurn, history, errorMessage: result.message });
        return;
      }

      setFailedSessionId(undefined);
      const completedTurn: CompletedTurn = {
        question: currentTurn.question,
        answer,
        analysis: result.analysis,
      };
      const nextHistory = [...history, completedTurn];
      setAnswer("");

      if (result.status === "ended") {
        setState({ kind: "ended", history: nextHistory });
        return;
      }

      setState({ kind: "active", sessionId, currentTurn: result.nextTurn, history: nextHistory });
    } catch {
      setState({ kind: "active", sessionId, currentTurn, history, errorMessage: GENERIC_ERROR });
    }
  }

  async function handleEnd() {
    if (state.kind !== "active") return;
    try {
      await fetch(`/api/interview/${state.sessionId}/end`, { method: "POST" });
    } catch {
      // Ending is best-effort — show the wrap-up regardless.
    }
    setState({ kind: "ended", history: state.history });
  }

  function handleRestart() {
    setAnswer("");
    setState({ kind: "idle" });
  }

  if (state.kind === "idle" || state.kind === "starting") {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Ready when you are</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="prose-serif text-lg text-iron">
            A text-based software engineering interview. The interviewer asks a question, you
            answer in English, and each answer is scored — including how clearly you communicate
            technical ideas.
          </p>
          {state.kind === "idle" && state.errorMessage ? (
            <p role="alert" className="text-sm text-destructive">{state.errorMessage}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={handleStart} disabled={state.kind === "starting"}>
            {state.kind === "starting" ? "Starting..." : "Start interview"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state.kind === "ended") {
    return (
      <div className="space-y-16">
        {state.history.map((turn, index) => (
          <TurnFeedback key={index} turn={turn} index={index} />
        ))}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-heading-sm">Interview complete.</p>
            <Button onClick={handleRestart} variant="outline">
              Start a new interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = state.kind === "submitting";

  return (
    <div className="space-y-16">
      {state.history.map((turn, index) => (
        <TurnFeedback key={index} turn={turn} index={index} />
      ))}

      <section className="grid gap-x-16 gap-y-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className="label-mono text-muted-foreground">
            Question {state.history.length + 1}
          </p>
          <h2 className="text-heading-sm">{state.currentTurn.question}</h2>
        </div>
        <div className="space-y-6">
          <WritingSheet
            label="Your answer"
            value={answer}
            onChange={setAnswer}
            maxLength={MAX_LENGTH}
            placeholder="Answer in English..."
            disabled={isSubmitting}
            minHeight="min-h-[240px]"
          />
          {state.kind === "active" && state.errorMessage ? (
            <p role="alert" className="text-sm text-destructive">{state.errorMessage}</p>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            <Button onClick={handleSubmit} disabled={isSubmitting || answer.trim().length === 0}>
              {isSubmitting ? "Submitting..." : "Submit answer"}
            </Button>
            <Button variant="ghost" onClick={handleEnd} disabled={isSubmitting}>
              End interview
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
