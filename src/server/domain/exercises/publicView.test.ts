import { describe, expect, it } from "vitest";

import { toPublicExercise } from "@/server/domain/exercises/publicView";

describe("toPublicExercise", () => {
  it("never includes correctOptionIndex for multiple choice", () => {
    const publicExercise = toPublicExercise({
      type: "MULTIPLE_CHOICE",
      instruction: "Choose the correct sentence.",
      explanation: "secret",
      options: ["a", "b"],
      correctOptionIndex: 1,
    });

    expect(publicExercise).not.toHaveProperty("correctOptionIndex");
    expect(publicExercise).not.toHaveProperty("explanation");
  });

  it("never includes acceptableAnswers for fill-blank/rewrite/translation", () => {
    const fillBlank = toPublicExercise({
      type: "FILL_BLANK",
      instruction: "x",
      explanation: "secret",
      template: "x ______ y",
      acceptableAnswers: ["understanding"],
    });
    const rewrite = toPublicExercise({
      type: "REWRITE",
      instruction: "x",
      explanation: "secret",
      original: "I have difficulty to understand concurrency.",
      acceptableAnswers: ["I have difficulty understanding concurrency."],
    });
    const translation = toPublicExercise({
      type: "TRANSLATION",
      instruction: "x",
      explanation: "secret",
      sourceText: "Eu dependo desta biblioteca.",
      acceptableAnswers: ["I depend on this library."],
    });

    for (const publicExercise of [fillBlank, rewrite, translation]) {
      expect(publicExercise).not.toHaveProperty("acceptableAnswers");
      expect(publicExercise).not.toHaveProperty("explanation");
    }
  });

  it("preserves the visible prompt content", () => {
    const publicExercise = toPublicExercise({
      type: "FILL_BLANK",
      instruction: "Fill in the blank.",
      explanation: "secret",
      template: "I have difficulty ______ concurrency.",
      acceptableAnswers: ["understanding"],
    });

    expect(publicExercise).toEqual({
      type: "FILL_BLANK",
      instruction: "Fill in the blank.",
      template: "I have difficulty ______ concurrency.",
    });
  });
});
