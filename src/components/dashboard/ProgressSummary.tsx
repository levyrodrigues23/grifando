import { ScoreBar } from "@/components/writing/ScoreBar";
import { TARGET_SUCCESS } from "@/server/domain/exercises/difficulty";
import type { AverageScores } from "@/server/domain/progress/progress";

export function ProgressSummary({
  writingSessionsCompleted,
  exercisesCompleted,
  exerciseAccuracy,
  averageScores,
}: {
  writingSessionsCompleted: number;
  exercisesCompleted: number;
  exerciseAccuracy: { correct: number; total: number } | null;
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

      {exerciseAccuracy ? (
        <p className="text-sm">
          Exercise accuracy:{" "}
          <span className="font-medium">
            {Math.round((exerciseAccuracy.correct / exerciseAccuracy.total) * 100)}%
          </span>
          <span className="text-muted-foreground">
            {" "}
            over your last {exerciseAccuracy.total} · exercises aim for about {Math.round(TARGET_SUCCESS * 100)}%
          </span>
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Scores are AI-generated heuristics, not a validated English proficiency test.
      </p>
    </div>
  );
}
