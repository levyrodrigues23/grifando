"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AICredentials, AIProviderName } from "@/lib/aiCredentials";
import { aiFetch } from "@/lib/aiFetch";
import { clearAIKey, getStoredAIKey, saveAIKey } from "@/lib/aiKeyStore";
import { errorMessageFor } from "@/lib/responseError";

const PROVIDER_LABELS: Record<AIProviderName, string> = { gemini: "Gemini", anthropic: "Anthropic" };

type Status =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "works" }
  | { kind: "error"; message: string }
  | { kind: "removed" };

const TEST_FAILURE = "We couldn't check the key right now. It's saved — try again in a minute.";
const STATUS_MESSAGES = {
  invalid: "This key doesn't work. Check that you copied all of it and picked the right provider.",
  busy: "The provider is busy, so we couldn't check the key. It's saved — try again in a minute.",
} as const;

const subscribeNever = () => () => {};

export function AIKeyForm() {
  // false during the server render and hydration, true afterwards: localStorage
  // only exists in the browser, so the stored key is read once this flips.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  // undefined = "whatever is stored"; set once the visitor saves or removes.
  const [savedOverride, setSaved] = useState<AICredentials | null>();
  const saved = savedOverride !== undefined ? savedOverride : hydrated ? getStoredAIKey() : null;
  const [chosenProvider, setProvider] = useState<AIProviderName>();
  const provider = chosenProvider ?? saved?.provider ?? "gemini";
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (apiKey.trim()) {
      const credentials = { provider, apiKey: apiKey.trim() };
      saveAIKey(credentials);
      setSaved(credentials);
      setApiKey("");
    }
    setStatus({ kind: "testing" });

    try {
      const response = await aiFetch("/api/ai-key/test", { method: "POST" });
      if (!response.ok) {
        setStatus({ kind: "error", message: await errorMessageFor(response, TEST_FAILURE) });
        return;
      }
      const data = (await response.json()) as { status?: string };
      if (data.status === "works") setStatus({ kind: "works" });
      else if (data.status === "invalid" || data.status === "busy") {
        setStatus({ kind: "error", message: STATUS_MESSAGES[data.status] });
      } else setStatus({ kind: "error", message: TEST_FAILURE });
    } catch {
      setStatus({ kind: "error", message: TEST_FAILURE });
    }
  }

  function handleRemove() {
    clearAIKey();
    setSaved(null);
    setApiKey("");
    setStatus({ kind: "removed" });
  }

  const testing = status.kind === "testing";
  const canSave = !testing && (apiKey.trim().length > 0 || saved !== null);

  return (
    <Card>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm text-iron">Provider</legend>
            <RadioGroup
              value={provider}
              onValueChange={(value) => setProvider(value === "anthropic" ? "anthropic" : "gemini")}
              disabled={testing}
            >
              <Label className="cursor-pointer gap-3 text-base text-foreground">
                <RadioGroupItem value="gemini" />
                Gemini <span className="text-muted-foreground">— recommended, free key</span>
              </Label>
              <Label className="cursor-pointer gap-3 text-base text-foreground">
                <RadioGroupItem value="anthropic" />
                Anthropic
              </Label>
            </RadioGroup>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="ai-key">API key</Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              maxLength={256}
              disabled={testing}
              placeholder={saved ? "Paste a new key to replace the saved one" : "Paste your key here"}
            />
            {saved ? (
              <p className="text-sm text-muted-foreground">
                A {PROVIDER_LABELS[saved.provider]} key is saved in this browser.
              </p>
            ) : null}
          </div>

          <div aria-live="polite" className="text-sm">
            {status.kind === "testing" ? <p className="text-muted-foreground">Checking your key...</p> : null}
            {status.kind === "works" ? <p className="text-success">Your key works. You&rsquo;re all set.</p> : null}
            {status.kind === "removed" ? <p className="text-muted-foreground">Key removed from this browser.</p> : null}
            {status.kind === "error" ? <p role="alert" className="text-destructive">{status.message}</p> : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSave}>
            {testing ? "Testing..." : "Save & test"}
          </Button>
          <Button type="button" variant="outline" onClick={handleRemove} disabled={testing || !saved}>
            Remove
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
