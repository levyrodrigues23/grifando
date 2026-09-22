import type Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming, Tool } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

import { AIResponseValidationError } from "@/server/ai/errors";
import {
  buildExerciseGenerationSystemPrompt,
  buildExerciseGenerationUserMessage,
  type ExerciseTarget,
} from "@/server/ai/prompts/exerciseGeneration";
import {
  buildWritingAnalysisSystemPrompt,
  buildWritingAnalysisUserMessage,
  type AnalyzeWritingInput,
} from "@/server/ai/prompts/writingAnalysis";
import type { AIProvider } from "@/server/ai/provider";
import { exerciseGenerationResultSchema } from "@/server/ai/schemas/exerciseGeneration";
import { writingAnalysisResultSchema } from "@/server/ai/schemas/writingAnalysis";

const WRITING_ANALYSIS_TOOL_NAME = "submit_writing_analysis";
const WRITING_ANALYSIS_MAX_TOKENS = 4096;
const EXERCISE_GENERATION_TOOL_NAME = "submit_exercises";
const EXERCISE_GENERATION_MAX_TOKENS = 4096;

// The only part of the Anthropic SDK this module depends on — keeps the
// provider trivially mockable in tests without a real API client.
export type AnthropicMessagesClient = {
  messages: {
    create(params: MessageCreateParamsNonStreaming): Promise<Message>;
  };
};

function findToolUseBlock(message: Message) {
  return message.content.find(
    (block): block is Extract<Anthropic.ContentBlock, { type: "tool_use" }> =>
      block.type === "tool_use",
  );
}

function buildWritingAnalysisTool(): Tool {
  return {
    name: WRITING_ANALYSIS_TOOL_NAME,
    description: "Submit the structured analysis of the user's English writing.",
    input_schema: z.toJSONSchema(writingAnalysisResultSchema) as Tool["input_schema"],
  };
}

function buildExerciseGenerationTool(): Tool {
  return {
    name: EXERCISE_GENERATION_TOOL_NAME,
    description: "Submit the generated practice exercises, one per requested target.",
    input_schema: z.toJSONSchema(exerciseGenerationResultSchema) as Tool["input_schema"],
  };
}

export function createAnthropicProvider(client: AnthropicMessagesClient, model: string): AIProvider {
  return {
    async analyzeWriting(input: AnalyzeWritingInput) {
      const response = await client.messages.create({
        model,
        max_tokens: WRITING_ANALYSIS_MAX_TOKENS,
        system: buildWritingAnalysisSystemPrompt(),
        messages: [{ role: "user", content: buildWritingAnalysisUserMessage(input) }],
        tools: [buildWritingAnalysisTool()],
        tool_choice: { type: "tool", name: WRITING_ANALYSIS_TOOL_NAME },
      });

      const toolUseBlock = findToolUseBlock(response);

      if (!toolUseBlock) {
        throw new AIResponseValidationError("Model did not return a tool_use block", []);
      }

      const result = writingAnalysisResultSchema.safeParse(toolUseBlock.input);

      if (!result.success) {
        throw new AIResponseValidationError(
          "Writing analysis response failed schema validation",
          result.error.issues,
        );
      }

      return result.data;
    },

    async generateExercises(targets: ExerciseTarget[]) {
      const response = await client.messages.create({
        model,
        max_tokens: EXERCISE_GENERATION_MAX_TOKENS,
        system: buildExerciseGenerationSystemPrompt(),
        messages: [{ role: "user", content: buildExerciseGenerationUserMessage(targets) }],
        tools: [buildExerciseGenerationTool()],
        tool_choice: { type: "tool", name: EXERCISE_GENERATION_TOOL_NAME },
      });

      const toolUseBlock = findToolUseBlock(response);

      if (!toolUseBlock) {
        throw new AIResponseValidationError("Model did not return a tool_use block", []);
      }

      const result = exerciseGenerationResultSchema.safeParse(toolUseBlock.input);

      if (!result.success) {
        throw new AIResponseValidationError(
          "Exercise generation response failed schema validation",
          result.error.issues,
        );
      }

      if (result.data.exercises.length !== targets.length) {
        throw new AIResponseValidationError(
          `Expected ${targets.length} exercises, got ${result.data.exercises.length}`,
          [],
        );
      }

      const invalidMultipleChoice = result.data.exercises.find(
        (exercise) =>
          exercise.type === "MULTIPLE_CHOICE" &&
          exercise.correctOptionIndex >= exercise.options.length,
      );

      if (invalidMultipleChoice) {
        throw new AIResponseValidationError(
          "A multiple-choice exercise's correctOptionIndex is out of range",
          [],
        );
      }

      return result.data.exercises;
    },
  };
}
