import type { ReactNode } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { ScoreBar } from "@/components/writing/ScoreBar";
import { TARGET_SUCCESS } from "@/server/domain/exercises/difficulty";
import type { AverageScores } from "@/server/domain/progress/progress";

function Figure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-display tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

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
  const accuracy = exerciseAccuracy
    ? Math.round((exerciseAccuracy.correct / exerciseAccuracy.total) * 100)
    : null;

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3">
        <Figure value={<CountUp value={writingSessionsCompleted} />} label="Writing sessions" />
        <Figure value={<CountUp value={exercisesCompleted} />} label="Exercises done" />
        <Figure
          value={accuracy === null ? "—" : <CountUp value={accuracy} suffix="%" />}
          label={
            exerciseAccuracy
              ? `Accuracy over your last ${exerciseAccuracy.total} · aiming for about ${Math.round(TARGET_SUCCESS * 100)}%`
              : `Exercise accuracy · aiming for about ${Math.round(TARGET_SUCCESS * 100)}%`
          }
        />
      </div>

      {averageScores ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
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
    </div>
  );
}
