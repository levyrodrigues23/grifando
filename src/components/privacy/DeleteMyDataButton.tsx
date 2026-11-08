"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Actions } from "@/components/ui/field";
import { clearAIKey } from "@/lib/aiKeyStore";
import { errorMessageFor } from "@/lib/responseError";

const FAILURE = "We couldn't delete your data right now. Try again in a minute.";

type Step = "idle" | "confirm" | "deleting";

export function DeleteMyDataButton() {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setStep("deleting");
    setError(null);
    try {
      const response = await fetch("/api/me", { method: "DELETE" });
      if (!response.ok) {
        setError(await errorMessageFor(response, FAILURE));
        setStep("confirm");
        return;
      }
      clearAIKey();
      // Full reload on purpose: the session cookie is gone and the proxy must mint a new one.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch {
      setError(FAILURE);
      setStep("confirm");
    }
  }

  return (
    <div className="space-y-3">
      {step === "idle" ? (
        <Button type="button" variant="destructive" onClick={() => setStep("confirm")}>
          Delete my data
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-destructive">
            This permanently deletes everything stored for you and removes your AI key from this
            browser. It cannot be undone.
          </p>
          <Actions>
            <Button
              type="button"
              variant="destructive"
              disabled={step === "deleting"}
              onClick={handleDelete}
            >
              {step === "deleting" ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={step === "deleting"}
              onClick={() => {
                setStep("idle");
                setError(null);
              }}
            >
              Cancel
            </Button>
          </Actions>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
