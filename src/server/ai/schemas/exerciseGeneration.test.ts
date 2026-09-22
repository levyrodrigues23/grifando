import { describe, expect, it } from "vitest";

import { exerciseGenerationResultSchema } from "@/server/ai/schemas/exerciseGeneration";

describe("exerciseGenerationResultSchema", () => {
  it("accepts one well-formed exercise of each type", () => {
    const result = exerciseGenerationResultSchema.safeParse({
      exercises: [
        {
          type: "MULTIPLE_CHOICE",
          instruction: "Choose the correct sentence.",
          explanation: "Use 'depend on', not 'depend of'.",
          options: ["I depend of this library.", "I depend on this library."],
          correctOptionIndex: 1,
        },
        {
          type: "FILL_BLANK",
          instruction: "Fill in the blank.",
          explanation: "'Have difficulty' takes a gerund.",
          template: "I have difficulty ______ concurrency.",
          acceptableAnswers: ["understanding"],
        },
        {
          type: "REWRITE",
          instruction: "Rewrite naturally.",
          explanation: "Prefer the gerund form.",
          original: "I have difficulty to understand concurrency.",
          acceptableAnswers: ["I have difficulty understanding concurrency."],
        },
        {
          type: "TRANSLATION",
          instruction: "Translate into English.",
          explanation: "Watch out for the preposition.",
          sourceText: "Eu dependo desta biblioteca.",
          acceptableAnswers: ["I depend on this library."],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty exercises array", () => {
    const result = exerciseGenerationResultSchema.safeParse({ exercises: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown exercise type", () => {
    const result = exerciseGenerationResultSchema.safeParse({
      exercises: [{ type: "TRUE_FALSE", instruction: "x", explanation: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a multiple-choice exercise with fewer than two options", () => {
    const result = exerciseGenerationResultSchema.safeParse({
      exercises: [
        {
          type: "MULTIPLE_CHOICE",
          instruction: "x",
          explanation: "x",
          options: ["only one"],
          correctOptionIndex: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fill-blank exercise with no acceptable answers", () => {
    const result = exerciseGenerationResultSchema.safeParse({
      exercises: [
        {
          type: "FILL_BLANK",
          instruction: "x",
          explanation: "x",
          template: "x ______ y",
          acceptableAnswers: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
