"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SAVE_ERROR = "Couldn't save this word. Please try again.";

export function VocabularyForm({
  initialTerm = "",
  initialExample = "",
  sourceSessionId,
}: {
  initialTerm?: string;
  initialExample?: string;
  sourceSessionId?: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(initialTerm);
  const [meaningPt, setMeaningPt] = useState("");
  const [exampleSentence, setExampleSentence] = useState(initialExample);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, meaningPt, exampleSentence, sourceSessionId }),
      });
      if (!response.ok) {
        setError(SAVE_ERROR);
        return;
      }
      setTerm("");
      setMeaningPt("");
      setExampleSentence("");
      // Drops the ?term=… prefill from the URL and re-reads the list.
      router.replace("/vocabulary");
      router.refresh();
    } catch {
      setError(SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  const canSave = term.trim() && meaningPt.trim() && exampleSentence.trim();

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Save a word or expression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="vocab-term">Term</Label>
            <Input id="vocab-term" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vocab-meaning">Meaning in Portuguese</Label>
            <Input
              id="vocab-meaning"
              value={meaningPt}
              onChange={(e) => setMeaningPt(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vocab-example">Example sentence</Label>
            <Input
              id="vocab-example"
              value={exampleSentence}
              onChange={(e) => setExampleSentence(e.target.value)}
              maxLength={500}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={!canSave || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
