import { ScoreBar } from "@/components/writing/ScoreBar";
import type { CompletedTurn } from "@/components/interview/types";

export function TurnFeedback({ turn, index }: { turn: CompletedTurn; index: number }) {
  const { analysis } = turn;

  return (
    <section className="grid gap-x-16 gap-y-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3">
        <p className="label-mono text-muted-foreground">Question {index + 1}</p>
        <h2 className="text-heading-sm">{turn.question}</h2>
      </div>
      <div className="space-y-6">
        <p className="prose-serif rounded-[4px] bg-card p-6 text-lg ring-1 ring-border md:p-8">
          {turn.answer}
        </p>
        <p className="text-iron">{analysis.overallFeedback}</p>
        {analysis.naturalText !== turn.answer ? (
          <div className="space-y-2 rounded-[4px] bg-linen p-6 md:p-8">
            <p className="label-mono text-muted-foreground">More naturally</p>
            <p className="prose-serif text-lg">{analysis.naturalText}</p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-5">
          <ScoreBar label="Grammar" value={analysis.grammarScore} />
          <ScoreBar label="Vocabulary" value={analysis.vocabularyScore} />
          <ScoreBar label="Clarity" value={analysis.clarityScore} />
          <ScoreBar label="Naturalness" value={analysis.naturalnessScore} />
          {analysis.technicalCommunicationScore !== null ? (
            <ScoreBar label="Tech. communication" value={analysis.technicalCommunicationScore} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
