export type ScoreSet = {
  grammarScore: number;
  vocabularyScore: number;
  clarityScore: number;
  naturalnessScore: number;
};

export type AverageScores = {
  grammar: number;
  vocabulary: number;
  clarity: number;
  naturalness: number;
};

// Deliberately simple (a mean, rounded) — SPEC.md's Progress section warns
// against fake precision; this is a heuristic trend, not a validated metric.
export function computeAverageScores(scoreSets: ScoreSet[]): AverageScores | null {
  if (scoreSets.length === 0) {
    return null;
  }

  const sum = scoreSets.reduce(
    (acc, s) => ({
      grammar: acc.grammar + s.grammarScore,
      vocabulary: acc.vocabulary + s.vocabularyScore,
      clarity: acc.clarity + s.clarityScore,
      naturalness: acc.naturalness + s.naturalnessScore,
    }),
    { grammar: 0, vocabulary: 0, clarity: 0, naturalness: 0 },
  );

  const count = scoreSets.length;
  return {
    grammar: Math.round(sum.grammar / count),
    vocabulary: Math.round(sum.vocabulary / count),
    clarity: Math.round(sum.clarity / count),
    naturalness: Math.round(sum.naturalness / count),
  };
}
