import { describe, expect, it, vi } from "vitest";

import { ExerciseType, MistakeCategory, PromptType } from "@/generated/prisma/enums";
import { AIResponseValidationError } from "@/server/ai/errors";
import type { AnthropicMessagesClient } from "@/server/ai/providers/anthropic";
import { createAnthropicProvider } from "@/server/ai/providers/anthropic";

function fakeMessage(content: unknown[]) {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    content,
    model: "test-model",
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as never;
}

function validAnalysisInput() {
  return {
    correctedText: "I have difficulty understanding concurrency.",
    naturalText: "Concurrency is something I struggle with.",
    overallFeedback: "Good attempt overall.",
    scores: { grammar: 80, vocabulary: 85, clarity: 90, naturalness: 70 },
    mistakes: [],
  };
}

describe("createAnthropicProvider.analyzeWriting", () => {
  it("returns the validated result when the model returns a well-formed tool_use block", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([{ type: "tool_use", id: "tool_1", name: "submit_writing_analysis", input: validAnalysisInput() }]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    const result = await provider.analyzeWriting({
      text: "I have difficulty to understand concurrency.",
      promptType: PromptType.FREE,
    });

    expect(result.correctedText).toBe("I have difficulty understanding concurrency.");
    expect(create).toHaveBeenCalledOnce();
  });

  it("forces the tool_choice to the writing-analysis tool", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([{ type: "tool_use", id: "tool_1", name: "submit_writing_analysis", input: validAnalysisInput() }]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE });

    const callArgs = create.mock.calls[0][0];
    expect(callArgs.tool_choice).toEqual({ type: "tool", name: "submit_writing_analysis" });
  });

  it("throws AIResponseValidationError when no tool_use block is returned", async () => {
    const create = vi.fn().mockResolvedValue(fakeMessage([{ type: "text", text: "I refuse to use the tool." }]));
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await expect(
      provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE }),
    ).rejects.toBeInstanceOf(AIResponseValidationError);
  });

  it("throws AIResponseValidationError when the tool input fails schema validation", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        {
          type: "tool_use",
          id: "tool_1",
          name: "submit_writing_analysis",
          input: { correctedText: "missing everything else" },
        },
      ]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await expect(
      provider.analyzeWriting({ text: "some text", promptType: PromptType.FREE }),
    ).rejects.toBeInstanceOf(AIResponseValidationError);
  });

  it("never touches the network — a broken client rejects instead of hanging", async () => {
    const create = vi.fn().mockRejectedValue(new Error("network down"));
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

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

describe("createAnthropicProvider.generateExercises", () => {
  it("returns the validated exercises when the model returns a well-formed tool_use block", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        {
          type: "tool_use",
          id: "tool_1",
          name: "submit_exercises",
          input: { exercises: [fakeMultipleChoiceExercise()] },
        },
      ]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    const result = await provider.generateExercises(oneTarget);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("MULTIPLE_CHOICE");
  });

  it("throws AIResponseValidationError when the exercise count doesn't match the target count", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        { type: "tool_use", id: "tool_1", name: "submit_exercises", input: { exercises: [] } },
      ]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await expect(provider.generateExercises(oneTarget)).rejects.toBeInstanceOf(
      AIResponseValidationError,
    );
  });

  it("throws AIResponseValidationError when a multiple-choice correctOptionIndex is out of range", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        {
          type: "tool_use",
          id: "tool_1",
          name: "submit_exercises",
          input: {
            exercises: [{ ...fakeMultipleChoiceExercise(), correctOptionIndex: 5 }],
          },
        },
      ]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await expect(provider.generateExercises(oneTarget)).rejects.toBeInstanceOf(
      AIResponseValidationError,
    );
  });

  it("throws AIResponseValidationError when no tool_use block is returned", async () => {
    const create = vi.fn().mockResolvedValue(fakeMessage([{ type: "text", text: "no." }]));
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await expect(provider.generateExercises(oneTarget)).rejects.toBeInstanceOf(
      AIResponseValidationError,
    );
  });
});

describe("createAnthropicProvider.continueInterview", () => {
  it("returns the validated next question", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        {
          type: "tool_use",
          id: "tool_1",
          name: "submit_interview_question",
          input: { question: "Tell me about a project you're proud of." },
        },
      ]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    const result = await provider.continueInterview([]);

    expect(result.question).toBe("Tell me about a project you're proud of.");
  });

  it("throws AIResponseValidationError when the tool input fails schema validation", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        { type: "tool_use", id: "tool_1", name: "submit_interview_question", input: {} },
      ]),
    );
    const client: AnthropicMessagesClient = { messages: { create } };
    const provider = createAnthropicProvider(client, "test-model");

    await expect(provider.continueInterview([])).rejects.toBeInstanceOf(
      AIResponseValidationError,
    );
  });
});

describe("createAnthropicProvider.explainAttempt", () => {
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
    const create = vi.fn().mockResolvedValue(
      fakeMessage([
        {
          type: "tool_use",
          id: "tool_1",
          name: "submit_answer_explanation",
          input: { explanation: "'Depend' is followed by 'on', not 'of'." },
        },
      ]),
    );
    const provider = createAnthropicProvider({ messages: { create } }, "test-model");

    const result = await provider.explainAttempt(input);

    expect(result.explanation).toContain("'on'");
  });

  it("throws AIResponseValidationError on an invalid tool input", async () => {
    const create = vi.fn().mockResolvedValue(
      fakeMessage([{ type: "tool_use", id: "tool_1", name: "submit_answer_explanation", input: {} }]),
    );
    const provider = createAnthropicProvider({ messages: { create } }, "test-model");

    await expect(provider.explainAttempt(input)).rejects.toBeInstanceOf(AIResponseValidationError);
  });
});
