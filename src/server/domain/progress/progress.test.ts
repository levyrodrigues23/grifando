import { describe, expect, it } from "vitest";

import { computeAverageScores } from "@/server/domain/progress/progress";

describe("computeAverageScores", () => {
  it("returns null for an empty list rather than dividing by zero", () => {
    expect(computeAverageScores([])).toBeNull();
  });

  it("returns the scores unchanged for a single session", () => {
    const result = computeAverageScores([
      { grammarScore: 80, vocabularyScore: 70, clarityScore: 90, naturalnessScore: 60 },
    ]);
    expect(result).toEqual({ grammar: 80, vocabulary: 70, clarity: 90, naturalness: 60 });
  });

  it("averages each dimension independently across sessions", () => {
    const result = computeAverageScores([
      { grammarScore: 80, vocabularyScore: 80, clarityScore: 80, naturalnessScore: 80 },
      { grammarScore: 100, vocabularyScore: 60, clarityScore: 90, naturalnessScore: 70 },
    ]);
    expect(result).toEqual({ grammar: 90, vocabulary: 70, clarity: 85, naturalness: 75 });
  });

  it("rounds to the nearest whole number", () => {
    const result = computeAverageScores([
      { grammarScore: 80, vocabularyScore: 80, clarityScore: 80, naturalnessScore: 80 },
      { grammarScore: 81, vocabularyScore: 81, clarityScore: 81, naturalnessScore: 81 },
      { grammarScore: 79, vocabularyScore: 79, clarityScore: 79, naturalnessScore: 79 },
    ]);
    expect(result).toEqual({ grammar: 80, vocabulary: 80, clarity: 80, naturalness: 80 });
  });
});
