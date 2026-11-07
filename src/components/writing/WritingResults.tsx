import { Button } from "@/components/ui/button";
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

  const mistakeCount = analysis.occurrences.length;

  return (
    <div className="space-y-20">
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="proof-title" className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="proof-title" className="text-heading">
              Your writing
            </h2>
            <span className="label-mono text-muted-foreground">
              {mistakeCount === 0
                ? "No marks"
                : `${mistakeCount} mark${mistakeCount === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="rounded-[4px] bg-card p-6 ring-1 ring-border md:p-10">
            <HighlightedText text={session.originalText} mistakes={analysis.occurrences} />
          </div>
          <p className="prose-serif text-lg text-iron">{analysis.overallFeedback}</p>
        </section>

        <section aria-labelledby="notes-title">
          <h2 id="notes-title" className="text-heading mb-6">
            Notes
          </h2>
          {mistakeCount > 0 ? (
            <div className="border-b border-border">
              {analysis.occurrences.map((mistake, index) => (
                <MistakeCard key={mistake.id} mistake={mistake} index={index} sessionId={session.id} />
              ))}
            </div>
          ) : (
            <p className="prose-serif text-lg text-iron">
              Nothing to correct here — clean, natural English.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-[4px] bg-linen p-6 md:p-10">
          <h2 className="text-heading-sm">Corrected version</h2>
          <p className="prose-serif text-lg leading-relaxed whitespace-pre-wrap">
            {analysis.correctedText}
          </p>
        </section>
        <section className="space-y-4 rounded-[4px] bg-linen p-6 md:p-10">
          <h2 className="text-heading-sm">Natural version</h2>
          <p className="text-sm text-muted-foreground">
            How a fluent speaker might phrase the same idea — one option, not the only correct
            way to say it.
          </p>
          <p className="prose-serif text-lg leading-relaxed whitespace-pre-wrap">
            {analysis.naturalText}
          </p>
        </section>
      </div>

      <section className="space-y-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-heading">Scores</h2>
          <span className="label-mono text-muted-foreground">Heuristic, model-generated</span>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          <ScoreBar label="Grammar" value={analysis.grammarScore} />
          <ScoreBar label="Vocabulary" value={analysis.vocabularyScore} />
          <ScoreBar label="Clarity" value={analysis.clarityScore} />
          <ScoreBar label="Naturalness" value={analysis.naturalnessScore} />
          {analysis.technicalCommunicationScore !== null ? (
            <ScoreBar label="Technical communication" value={analysis.technicalCommunicationScore} />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Scores are AI-generated heuristics to guide practice, not a validated English
          proficiency test.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {nextStep ? <Button onClick={nextStep.onClick}>{nextStep.label}</Button> : null}
        <Button onClick={onWriteAnother} variant={nextStep ? "ghost" : "default"}>
          Write something else
        </Button>
      </div>
    </div>
  );
}
