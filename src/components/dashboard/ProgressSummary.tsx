import { ScoreBar } from "@/components/writing/ScoreBar";
import type { AverageScores } from "@/server/domain/progress/progress";

export function ProgressSummary({
  writingSessionsCompleted,
  exercisesCompleted,
  averageScores,
}: {
  writingSessionsCompleted: number;
  exercisesCompleted: number;
  averageScores: AverageScores | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-8">
        <div>
          <p className="text-2xl font-medium">{writingSessionsCompleted}</p>
          <p className="text-xs tracking-normal text-muted-foreground uppercase">
            Writing sessions
          </p>
        </div>
        <div>
          <p className="text-2xl font-medium">{exercisesCompleted}</p>
          <p className="text-xs tracking-normal text-muted-foreground uppercase">
            Exercises done
          </p>
        </div>
      </div>

      {averageScores ? (
        <div className="grid grid-cols-2 gap-3">
          <ScoreBar label="Grammar" value={averageScores.grammar} />
          <ScoreBar label="Vocabulary" value={averageScores.vocabulary} />
          <ScoreBar label="Clarity" value={averageScores.clarity} />
          <ScoreBar label="Naturalness" value={averageScores.naturalness} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Average scores will show up after your first analyzed writing session.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Scores are AI-generated heuristics, not a validated English proficiency test.
      </p>
    </div>
  );
}
