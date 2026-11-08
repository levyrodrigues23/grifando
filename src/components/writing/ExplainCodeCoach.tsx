"use client";

import { useState } from "react";

import { KeyRequiredNotice } from "@/components/settings/KeyRequiredNotice";
import { Button } from "@/components/ui/button";
import { WritingResults } from "@/components/writing/WritingResults";
import { WritingSheet } from "@/components/writing/WritingSheet";
import type { SubmitWritingResponse, WritingSessionDTO } from "@/components/writing/types";
import { MissingAIKeyError, aiFetch } from "@/lib/aiFetch";
import { errorMessageFor, failedSessionIdFrom } from "@/lib/responseError";
import { AnalyzingStatus, ButtonSpinner, WRITING_STEPS } from "@/components/feedback/AnalyzingStatus";

const MAX_CODE_LENGTH = 2000;
const MAX_TEXT_LENGTH = 5000;
const EXPLAIN_CODE_INSTRUCTION = "Explain what this code does.";
const GENERIC_FAILURE_MESSAGE =
  "We couldn't analyze this writing right now. Your text has not been lost.";

type ViewState =
  | { kind: "editing"; errorMessage?: string; keyRequired?: boolean }
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
      const response = await aiFetch("/api/writing-sessions", {
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
    } catch (error) {
      setView(
        error instanceof MissingAIKeyError
          ? { kind: "editing", keyRequired: true }
          : { kind: "editing", errorMessage: GENERIC_FAILURE_MESSAGE },
      );
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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <WritingSheet
          label="Code snippet"
          variant="code"
          value={code}
          onChange={setCode}
          maxLength={MAX_CODE_LENGTH}
          disabled={isSubmitting}
          placeholder="export async function registerUser(...) { ... }"
        />
        <WritingSheet
          label="Your explanation, in English"
          value={text}
          onChange={setText}
          maxLength={MAX_TEXT_LENGTH}
          disabled={isSubmitting}
          placeholder="This function checks whether..."
        />
      </div>
      {view.kind === "editing" && view.keyRequired ? <KeyRequiredNotice /> : null}
      {view.kind === "editing" && view.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {view.errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? (
            <>
              <ButtonSpinner /> Analyzing…
            </>
          ) : (
            "Get feedback"
          )}
        </Button>
        {isSubmitting ? <AnalyzingStatus steps={WRITING_STEPS} /> : null}
      </div>
    </div>
  );
}
