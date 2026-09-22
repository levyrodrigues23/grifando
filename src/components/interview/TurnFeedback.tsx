import { Card, CardContent } from "@/components/ui/card";
import { ScoreBar } from "@/components/writing/ScoreBar";
import type { CompletedTurn } from "@/components/interview/types";

export function TurnFeedback({ turn }: { turn: CompletedTurn }) {
  const { analysis } = turn;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{turn.question}</p>
      <p className="text-sm text-muted-foreground">{turn.answer}</p>
      <Card size="sm">
        <CardContent className="space-y-3">
          <p className="text-sm">{analysis.overallFeedback}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ScoreBar label="Grammar" value={analysis.grammarScore} />
            <ScoreBar label="Vocabulary" value={analysis.vocabularyScore} />
            <ScoreBar label="Clarity" value={analysis.clarityScore} />
            <ScoreBar label="Naturalness" value={analysis.naturalnessScore} />
            {analysis.technicalCommunicationScore !== null ? (
              <ScoreBar
                label="Tech. communication"
                value={analysis.technicalCommunicationScore}
              />
            ) : null}
          </div>
          {analysis.naturalText !== turn.answer ? (
            <p className="text-sm text-muted-foreground">
              More naturally: <span className="italic">&ldquo;{analysis.naturalText}&rdquo;</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
