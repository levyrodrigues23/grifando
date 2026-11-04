import { describe, expect, it } from "vitest";

import { writingAnalysisResultSchema } from "@/server/ai/schemas/writingAnalysis";

function validResult() {
  return {
    correctedText: "I have difficulty understanding concurrency.",
    naturalText: "Concurrency is something I struggle with.",
    overallFeedback: "Good attempt — one small preposition slip.",
    scores: { grammar: 80, vocabulary: 85, clarity: 90, naturalness: 70 },
    mistakes: [
      {
        originalSpan: "difficulty to understand",
        correctedSpan: "difficulty understanding",
        category: "VERB_TENSE",
        severity: "ERROR",
        explanation: "After 'have difficulty', English uses a gerund.",
        example: "She has difficulty sleeping at night.",
        patternKey: "have-difficulty-gerund",
      },
    ],
  };
}

describe("writingAnalysisResultSchema", () => {
  it("accepts a well-formed response", () => {
    const result = writingAnalysisResultSchema.safeParse(validResult());
    expect(result.success).toBe(true);
  });

  it("accepts the optional l1Transfer flag and rejects a non-boolean one", () => {
    const flagged = validResult();
    Object.assign(flagged.mistakes[0], { l1Transfer: true });
    const parsed = writingAnalysisResultSchema.parse(flagged);
    expect(parsed.mistakes[0].l1Transfer).toBe(true);

    expect(writingAnalysisResultSchema.parse(validResult()).mistakes[0].l1Transfer).toBeUndefined();

    const invalid = validResult();
    Object.assign(invalid.mistakes[0], { l1Transfer: "yes" });
    expect(writingAnalysisResultSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts a response with an empty mistakes array", () => {
    const result = writingAnalysisResultSchema.safeParse({
      ...validResult(),
      mistakes: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a score outside 0-100", () => {
    const input = validResult();
    input.scores.grammar = 150;
    const result = writingAnalysisResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects an unknown mistake category", () => {
    const input = validResult();
    input.mistakes[0].category = "MADE_UP_CATEGORY";
    const result = writingAnalysisResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const input = validResult() as Record<string, unknown>;
    delete input.overallFeedback;
    const result = writingAnalysisResultSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a completely malformed payload without throwing", () => {
    const result = writingAnalysisResultSchema.safeParse("not even an object");
    expect(result.success).toBe(false);
  });

  it("accepts an optional technicalCommunication score for INTERVIEW mode", () => {
    const result = writingAnalysisResultSchema.safeParse({
      ...validResult(),
      scores: { ...validResult().scores, technicalCommunication: 75 },
    });
    expect(result.success).toBe(true);
  });

  it("omitting technicalCommunication is fine for every other mode", () => {
    const result = writingAnalysisResultSchema.safeParse(validResult());
    expect(result.success && result.data.scores.technicalCommunication).toBeUndefined();
  });
});
