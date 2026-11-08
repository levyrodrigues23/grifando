"use client";

import { useState } from "react";

import { KeyRequiredNotice } from "@/components/settings/KeyRequiredNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubmitAttemptResponse } from "@/components/exercises/types";
import { MissingAIKeyError, aiFetch } from "@/lib/aiFetch";
import { diffWords, findClosestAnswer } from "@/lib/answerDiff";
import { AnalyzingStatus, ButtonSpinner, EXPLAIN_STEPS } from "@/components/feedback/AnalyzingStatus";

function correctAnswerText(exercise: SubmitAttemptResponse["exercise"]): string {
  switch (exercise.type) {
    case "MULTIPLE_CHOICE":
      return exercise.options[exercise.correctOptionIndex];
    case "FILL_BLANK":
    case "REWRITE":
    case "TRANSLATION":
      return exercise.acceptableAnswers[0];
  }
}

// Free-text answers: compare against the acceptable answer closest to what the
// user wrote, word by word, instead of always showing the first one.
function AnswerDiff({ userAnswer, acceptableAnswers }: { userAnswer: string; acceptableAnswers: string[] }) {
  const expected = findClosestAnswer(userAnswer, acceptableAnswers);
  if (!expected) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">
        Closest answer: <span className="prose-serif text-lg text-foreground">{expected}</span>
      </p>
      <p className="prose-serif text-lg" aria-label="Differences between your answer and the closest answer">
        {diffWords(userAnswer, expected).map((segment, index) => (
          <span key={index}>
            {index > 0 ? " " : null}
            {segment.kind === "removed" ? (
              <del className="text-destructive decoration-1">{segment.text}</del>
            ) : segment.kind === "added" ? (
              <ins className="text-success no-underline">{segment.text}</ins>
            ) : (
              segment.text
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

type ExplanationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; text: string }
  | { kind: "error"; message: string }
  | { kind: "keyRequired" };

const EXPLANATION_ERROR = "We couldn't explain this answer right now. Your grade is unaffected.";

// "Explain my answer": an optional AI call on
// request; the grade above is already final and never changes.
function ExplainMyAnswer({ exerciseId, attemptId }: { exerciseId: string; attemptId: string }) {
  const [state, setState] = useState<ExplanationState>({ kind: "idle" });

  async function handleExplain() {
    setState({ kind: "loading" });
    try {
      const response = await aiFetch(`/api/exercises/${exerciseId}/attempts/${attemptId}/explanation`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as { explanation?: string; error?: string } | null;
      if (!response.ok || !data?.explanation) {
        setState({ kind: "error", message: data?.error ?? EXPLANATION_ERROR });
        return;
      }
      setState({ kind: "done", text: data.explanation });
    } catch (error) {
      setState(error instanceof MissingAIKeyError ? { kind: "keyRequired" } : { kind: "error", message: EXPLANATION_ERROR });
    }
  }

  if (state.kind === "done") {
    return <p className="prose-serif text-lg text-iron">{state.text}</p>;
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={handleExplain} disabled={state.kind === "loading"}>
        {state.kind === "loading" ? (
          <>
            <ButtonSpinner /> Explaining…
          </>
        ) : (
          "Explain my answer"
        )}
      </Button>
      {state.kind === "loading" ? <AnalyzingStatus steps={EXPLAIN_STEPS} /> : null}
      {state.kind === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state.kind === "keyRequired" ? <KeyRequiredNotice /> : null}
    </div>
  );
}

export function ExerciseResult({
  exerciseId,
  result,
  userAnswer,
  onNext,
  hasNext,
}: {
  exerciseId: string;
  result: SubmitAttemptResponse;
  userAnswer: string;
  onNext: () => void;
  hasNext: boolean;
}) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className={result.isCorrect ? "text-success" : "text-destructive"}>
          {result.isCorrect ? "Correct" : "Not quite"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result.isCorrect &&
          (result.exercise.type === "REWRITE" || result.exercise.type === "TRANSLATION" ? (
            <AnswerDiff userAnswer={userAnswer} acceptableAnswers={result.exercise.acceptableAnswers} />
          ) : (
            <p className="text-muted-foreground">
              Expected:{" "}
              <span className="prose-serif text-lg text-foreground">
                {correctAnswerText(result.exercise)}
              </span>
            </p>
          ))}
        <p className="text-iron">{result.explanation}</p>
        {!result.isCorrect && <ExplainMyAnswer exerciseId={exerciseId} attemptId={result.attemptId} />}
      </CardContent>
      <CardFooter>
        <Button onClick={onNext}>{hasNext ? "Next exercise" : "Done for now"}</Button>
      </CardFooter>
    </Card>
  );
}
