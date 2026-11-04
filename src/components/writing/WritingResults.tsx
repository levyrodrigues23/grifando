import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HighlightedText } from "@/components/writing/HighlightedText";
import { MistakeCard } from "@/components/writing/MistakeCard";
import { ScoreBar } from "@/components/writing/ScoreBar";
import type { WritingSessionDTO } from "@/components/writing/types";

export function WritingResults({
  session,
  onWriteAnother,
  nextStep,
}: {
  session: WritingSessionDTO;
  onWriteAnother: () => void;
  // Extra primary action after the results (e.g. the daily session's review step).
  nextStep?: { label: string; onClick: () => void };
}) {
  const analysis = session.analysis;

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your writing, with mistakes highlighted</CardTitle>
        </CardHeader>
        <CardContent>
          <HighlightedText text={session.originalText} mistakes={analysis.occurrences} />
        </CardContent>
      </Card>

      {analysis.occurrences.length > 0 && (
        <div className="space-y-3">
          {analysis.occurrences.map((mistake, index) => (
            <MistakeCard key={mistake.id} mistake={mistake} index={index} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Corrected version</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed whitespace-pre-wrap">{analysis.correctedText}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Natural version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            How a fluent speaker might phrase the same idea — one option, not the only correct
            way to say it.
          </p>
          <p className="leading-relaxed whitespace-pre-wrap">{analysis.naturalText}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{analysis.overallFeedback}</p>
          <Separator />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreBar label="Grammar" value={analysis.grammarScore} />
            <ScoreBar label="Vocabulary" value={analysis.vocabularyScore} />
            <ScoreBar label="Clarity" value={analysis.clarityScore} />
            <ScoreBar label="Naturalness" value={analysis.naturalnessScore} />
            {analysis.technicalCommunicationScore !== null ? (
              <ScoreBar
                label="Technical communication"
                value={analysis.technicalCommunicationScore}
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Scores are AI-generated heuristics to guide practice, not a validated English
            proficiency test.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {nextStep ? <Button onClick={nextStep.onClick}>{nextStep.label}</Button> : null}
        <Button onClick={onWriteAnother} variant="outline">
          Write something else
        </Button>
      </div>
    </div>
  );
}
