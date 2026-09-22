import { describe, expect, it } from "vitest";

import { MistakeCategory, ExerciseType } from "@/generated/prisma/enums";
import { buildExerciseGenerationUserMessage } from "@/server/ai/prompts/exerciseGeneration";

describe("buildExerciseGenerationUserMessage", () => {
  it("includes every target's type, category, and example", () => {
    const message = buildExerciseGenerationUserMessage([
      {
        type: ExerciseType.MULTIPLE_CHOICE,
        category: MistakeCategory.PREPOSITIONS,
        exampleOriginal: "I depend of this library.",
        exampleCorrection: "I depend on this library.",
      },
      {
        type: ExerciseType.FILL_BLANK,
        category: MistakeCategory.VERB_TENSE,
        exampleOriginal: "difficulty to understand",
        exampleCorrection: "difficulty understanding",
      },
    ]);

    expect(message).toContain("MULTIPLE_CHOICE");
    expect(message).toContain("PREPOSITIONS");
    expect(message).toContain("I depend of this library.");
    expect(message).toContain("FILL_BLANK");
    expect(message).toContain("VERB_TENSE");
  });

  it("numbers targets in order", () => {
    const message = buildExerciseGenerationUserMessage([
      {
        type: ExerciseType.REWRITE,
        category: MistakeCategory.ARTICLES,
        exampleOriginal: "a",
        exampleCorrection: "b",
      },
      {
        type: ExerciseType.TRANSLATION,
        category: MistakeCategory.ARTICLES,
        exampleOriginal: "c",
        exampleCorrection: "d",
      },
    ]);

    expect(message.indexOf("1. Type: REWRITE")).toBeLessThan(message.indexOf("2. Type: TRANSLATION"));
  });
});
