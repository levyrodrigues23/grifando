import { describe, expect, it, vi } from "vitest";

import { ExerciseType, MistakeCategory, PromptType } from "@/generated/prisma/enums";
import { AIKeyRejectedError, AIQuotaExceededError, AIResponseValidationError } from "@/server/ai/errors";
import type { GeminiContentClient } from "@/server/ai/providers/gemini";
import { createGeminiProvider, testKey } from "@/server/ai/providers/gemini";

function fakeResponse(json: unknown) {
  return { text: JSON.stringify(json) };
}

function validAnalysisResult() {
  return {
    correctedText: "I have difficulty understanding concurrency.",
    naturalText: "Concurrency is something I struggle with.",
    overallFeedback: "Good attempt overall.",
    scores: { grammar: 80, vocabulary: 85, clarity: 90, naturalness: 70 },
    mistakes: [],
  };
}

describe("createGeminiProvider.analyzeWriting", () => {
  it("returns the validated result when the model returns well-formed JSON text", async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse(validAnalysisResult()));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    const result = await provider.analyzeWriting({
      text: "I have difficulty to understand concurrency.",
      promptType: PromptType.FREE,
    });

    expect(result.correctedText).toBe("I have difficulty understanding concurrency.");
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("requests JSON mode with the schema attached", async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse(validAnalysisResult()));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    await provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE });

    const callArgs = generateContent.mock.calls[0][0];
    expect(callArgs.config.responseMimeType).toBe("application/json");
    expect(callArgs.config.responseJsonSchema).toBeDefined();
  });

  it("throws AIResponseValidationError when the model returns no text", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: undefined });
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    await expect(
      provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE }),
    ).rejects.toBeInstanceOf(AIResponseValidationError);
  });

  it("throws AIResponseValidationError when the model returns malformed JSON", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: "not json{" });
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    await expect(
      provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE }),
    ).rejects.toBeInstanceOf(AIResponseValidationError);
  });

  it("throws AIResponseValidationError when the JSON fails schema validation", async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ correctedText: "only this" }));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    await expect(
      provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE }),
    ).rejects.toBeInstanceOf(AIResponseValidationError);
  });

  it("never touches the network — a broken client rejects instead of hanging", async () => {
    const generateContent = vi.fn().mockRejectedValue(new Error("network down"));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    await expect(
      provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE }),
    ).rejects.toThrow("network down");
  });
});

function fakeMultipleChoiceExercise() {
  return {
    type: "MULTIPLE_CHOICE",
    instruction: "Choose the correct sentence.",
    explanation: "Use 'depend on', not 'depend of'.",
    options: ["I depend of this library.", "I depend on this library."],
    correctOptionIndex: 1,
  };
}

const oneTarget = [
  {
    type: ExerciseType.MULTIPLE_CHOICE,
    category: MistakeCategory.PREPOSITIONS,
    exampleOriginal: "I depend of this library.",
    exampleCorrection: "I depend on this library.",
    difficulty: 3,
  },
];

describe("createGeminiProvider.generateExercises", () => {
  it("returns the validated exercises for well-formed JSON", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValue(fakeResponse({ exercises: [fakeMultipleChoiceExercise()] }));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    const result = await provider.generateExercises(oneTarget);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("MULTIPLE_CHOICE");
  });

  it("throws AIResponseValidationError when the exercise count doesn't match", async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ exercises: [] }));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    await expect(provider.generateExercises(oneTarget)).rejects.toBeInstanceOf(
      AIResponseValidationError,
    );
  });
});

describe("createGeminiProvider.continueInterview", () => {
  it("returns the validated next question", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValue(fakeResponse({ question: "Tell me about a project you're proud of." }));
    const client: GeminiContentClient = { models: { generateContent } };
    const provider = createGeminiProvider(client, "test-model");

    const result = await provider.continueInterview([]);

    expect(result.question).toBe("Tell me about a project you're proud of.");
  });
});

describe("createGeminiProvider.explainAttempt", () => {
  const input = {
    exercise: {
      type: "FILL_BLANK" as const,
      instruction: "Fill the blank.",
      template: "It depends ___ the config.",
      acceptableAnswers: ["on"],
      explanation: "'Depend on'.",
    },
    userAnswer: "of",
  };

  it("returns the validated explanation", async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValue(fakeResponse({ explanation: "'Depend' is followed by 'on', not 'of'." }));
    const provider = createGeminiProvider({ models: { generateContent } }, "test-model");

    const result = await provider.explainAttempt(input);

    expect(result.explanation).toContain("'on'");
  });

  it("throws AIResponseValidationError on an invalid response", async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ explanation: "" }));
    const provider = createGeminiProvider({ models: { generateContent } }, "test-model");

    await expect(provider.explainAttempt(input)).rejects.toBeInstanceOf(AIResponseValidationError);
  });
});

describe("testKey", () => {
  it("makes one 1-token request and resolves when the key works", async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: undefined });
    await expect(testKey({ models: { generateContent } }, "test-model")).resolves.toBeUndefined();
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: "test-model", config: { maxOutputTokens: 1 } }),
    );
  });

  it("maps an invalid-key 400 to AIKeyRejectedError and a 429 to AIQuotaExceededError", async () => {
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("API key not valid"), { status: 400 }))
      .mockRejectedValueOnce(Object.assign(new Error("quota"), { status: 429 }));
    await expect(testKey({ models: { generateContent } }, "m")).rejects.toBeInstanceOf(AIKeyRejectedError);
    await expect(testKey({ models: { generateContent } }, "m")).rejects.toBeInstanceOf(AIQuotaExceededError);
  });
});

describe("toGeminiSchema", () => {
  it("drops array bounds and $schema that Gemini rejects, keeping the rest", async () => {
    const { z } = await import("zod");
    const { toGeminiSchema } = await import("@/server/ai/providers/gemini");
    const json = JSON.stringify(toGeminiSchema(z.object({ items: z.array(z.string().max(5)).min(1).max(50) })));
    expect(json).not.toMatch(/maxItems|minItems|\$schema/);
    expect(json).toContain('"maxLength":5');
  });
});
