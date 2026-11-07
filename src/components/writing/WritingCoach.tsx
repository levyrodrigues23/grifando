"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { WritingResults } from "@/components/writing/WritingResults";
import { WritingSheet } from "@/components/writing/WritingSheet";
import type { SubmitWritingResponse, WritingSessionDTO } from "@/components/writing/types";
import { errorMessageFor, failedSessionIdFrom } from "@/lib/responseError";

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

export function WritingCoach({
  initialChallenge,
  nextStep,
}: {
  initialChallenge?: InitialChallenge;
  // Shown after a successful analysis; receives the analyzed session's id.
  nextStep?: { label: string; onClick: (sessionId: string) => void };
}) {
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
        const savedSessionId = await failedSessionIdFrom(response);
        if (savedSessionId) setFailedSessionId(savedSessionId);
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
    const session = view.session;
    return (
      <WritingResults
        session={session}
        onWriteAnother={handleWriteAnother}
        nextStep={nextStep && { label: nextStep.label, onClick: () => nextStep.onClick(session.id) }}
      />
    );
  }

  const isSubmitting = view.kind === "submitting";

  return (
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <WritingSheet
          label={initialChallenge ? "Your answer" : "Your text"}
          value={text}
          onChange={setText}
          maxLength={MAX_LENGTH}
          disabled={isSubmitting}
          placeholder={
            initialChallenge
              ? "Write your answer here..."
              : "Free writing, a GitHub issue, a PR description, an explanation of something you built today..."
          }
        />
        {view.kind === "editing" && view.errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {view.errorMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={handleSubmit} disabled={isSubmitting || text.trim().length === 0}>
            {isSubmitting ? "Analyzing..." : "Get feedback"}
          </Button>
          {isSubmitting ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Reading your text — this can take a little while.
            </p>
          ) : null}
        </div>
      </div>

      <aside className="order-first space-y-4 lg:order-none lg:pt-6">
        {initialChallenge ? (
          <>
            <h2 className="label-mono text-muted-foreground">Prompt</h2>
            <p className="text-heading-sm">{initialChallenge.promptText}</p>
          </>
        ) : (
          <>
            <h2 className="label-mono text-muted-foreground">What you get back</h2>
            <p className="prose-serif text-lg text-iron">
              Your text with each mistake marked, a corrected version that keeps what you meant,
              and a natural version — one way a fluent speaker might say it.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
