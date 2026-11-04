"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { WritingResults } from "@/components/writing/WritingResults";
import type { SubmitWritingResponse, WritingSessionDTO } from "@/components/writing/types";
import { errorMessageFor } from "@/lib/responseError";

const MAX_CODE_LENGTH = 2000;
const MAX_TEXT_LENGTH = 5000;
const EXPLAIN_CODE_INSTRUCTION = "Explain what this code does.";
const GENERIC_FAILURE_MESSAGE =
  "We couldn't analyze this writing right now. Your text has not been lost.";

type ViewState =
  | { kind: "editing"; errorMessage?: string }
  | { kind: "submitting" }
  | { kind: "result"; session: WritingSessionDTO };

export function ExplainCodeCoach() {
  const [code, setCode] = useState("");
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
          promptType: "EXPLAIN_CODE",
          promptText: EXPLAIN_CODE_INSTRUCTION,
          originalText: text,
          codeSnippet: code,
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
    setCode("");
    setText("");
    setView({ kind: "editing" });
  }

  if (view.kind === "result") {
    return <WritingResults session={view.session} onWriteAnother={handleWriteAnother} />;
  }

  const isSubmitting = view.kind === "submitting";
  const canSubmit = code.trim().length > 0 && text.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Explain this code in English</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium uppercase tracking-normal">Paste a small code snippet</label>
          <Textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={MAX_CODE_LENGTH}
            rows={8}
            placeholder="export async function registerUser(...) { ... }"
            className="font-mono text-sm"
            disabled={isSubmitting}
          />
          <div className="text-right text-xs text-muted-foreground">
            {code.length} / {MAX_CODE_LENGTH}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium uppercase tracking-normal">Explain what it does, in English</label>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MAX_TEXT_LENGTH}
            rows={6}
            placeholder="This function checks whether..."
            disabled={isSubmitting}
          />
          <div className="text-right text-xs text-muted-foreground">
            {text.length} / {MAX_TEXT_LENGTH}
          </div>
        </div>

        {view.kind === "editing" && view.errorMessage ? (
          <p className="text-sm text-destructive">{view.errorMessage}</p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? "Analyzing..." : "Get feedback"}
        </Button>
      </CardFooter>
    </Card>
  );
}
