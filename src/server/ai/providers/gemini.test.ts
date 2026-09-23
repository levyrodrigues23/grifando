import { describe, expect, it, vi } from "vitest";

import { ExerciseType, MistakeCategory, PromptType } from "@/generated/prisma/enums";
import { AIResponseValidationError } from "@/server/ai/errors";
import type { GeminiContentClient } from "@/server/ai/providers/gemini";
import { createGeminiProvider } from "@/server/ai/providers/gemini";

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
