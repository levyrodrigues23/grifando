"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { WritingResults } from "@/components/writing/WritingResults";
import type { SubmitWritingResponse, WritingSessionDTO } from "@/components/writing/types";
import { errorMessageFor } from "@/lib/responseError";

const MAX_LENGTH = 5000;
const GENERIC_FAILURE_MESSAGE =
  "We couldn't analyze this writing right now. Your text has not been lost.";

export type InitialChallenge =
  | { promptType: "DAILY_CHALLENGE"; promptText: string }
  | { promptType: "TECHNICAL"; promptText: string; technicalCategory: string };

type ViewState =
  | { kind: "editing"; errorMessage?: string }
  | { kind: "submitting" }
  | { kind: "result"; session: WritingSessionDTO };

export function WritingCoach({ initialChallenge }: { initialChallenge?: InitialChallenge }) {
  const [text, setText] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "editing" });
  // Session of the last failed attempt; resubmitting re-analyzes it instead of
  // leaving it orphaned and creating a duplicate.
  const [failedSessionId, setFailedSessionId] = useState<string>();

  async function handleSubmit() {
    setView({ kind: "submitting" });

    try {
      const response = await fetch("/api/writing-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptType: initialChallenge?.promptType ?? "FREE",
          promptText: initialChallenge?.promptText,
          technicalCategory:
            initialChallenge?.promptType === "TECHNICAL"
              ? initialChallenge.technicalCategory
              : undefined,
          originalText: text,
          retrySessionId: failedSessionId,
        }),
      });

      if (!response.ok) {
        setView({ kind: "editing", errorMessage: await errorMessageFor(response, GENERIC_FAILURE_MESSAGE) });
        return;
      }

      const result = (await response.json()) as SubmitWritingResponse;

      if (result.status === "failed") {
        setFailedSessionId(result.sessionId);
        setView({ kind: "editing", errorMessage: result.message });
        return;
      }

      setFailedSessionId(undefined);
      setView({ kind: "result", session: result.session });
    } catch {
      setView({ kind: "editing", errorMessage: GENERIC_FAILURE_MESSAGE });
    }
  }

  function handleWriteAnother() {
    setText("");
    setView({ kind: "editing" });
  }

  if (view.kind === "result") {
    return <WritingResults session={view.session} onWriteAnother={handleWriteAnother} />;
  }

  const isSubmitting = view.kind === "submitting";
  const title =
    initialChallenge?.promptType === "DAILY_CHALLENGE"
      ? "Today's writing challenge"
      : initialChallenge?.promptType === "TECHNICAL"
        ? "Technical English"
        : "Write something in English";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {initialChallenge ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">{initialChallenge.promptText}</p>
        ) : null}
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_LENGTH}
          rows={10}
          placeholder={
            initialChallenge
              ? "Write your answer here..."
              : "Free writing, a GitHub issue, a PR description, an explanation of something you built today..."
          }
          disabled={isSubmitting}
        />
        <div className="text-right text-xs text-muted-foreground">
          {text.length} / {MAX_LENGTH}
        </div>
        {view.kind === "editing" && view.errorMessage ? (
          <p className="text-sm text-destructive">{view.errorMessage}</p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting || text.trim().length === 0}>
          {isSubmitting ? "Analyzing..." : "Get feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}
