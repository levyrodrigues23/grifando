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
  buildInterviewSystemPrompt,
  buildInterviewUserMessage,
  type InterviewHistoryItem,
} from "@/server/ai/prompts/interview";
import {
  buildWritingAnalysisSystemPrompt,
  buildWritingAnalysisUserMessage,
  type AnalyzeWritingInput,
} from "@/server/ai/prompts/writingAnalysis";
import type { AIProvider } from "@/server/ai/provider";
import { exerciseGenerationResultSchema } from "@/server/ai/schemas/exerciseGeneration";
import { interviewQuestionResultSchema } from "@/server/ai/schemas/interview";
import { writingAnalysisResultSchema } from "@/server/ai/schemas/writingAnalysis";

const WRITING_ANALYSIS_TOOL_NAME = "submit_writing_analysis";
const WRITING_ANALYSIS_MAX_TOKENS = 4096;
const EXERCISE_GENERATION_TOOL_NAME = "submit_exercises";
const EXERCISE_GENERATION_MAX_TOKENS = 4096;
const INTERVIEW_QUESTION_TOOL_NAME = "submit_interview_question";
const INTERVIEW_QUESTION_MAX_TOKENS = 1024;

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

function toTool(name: string, description: string, schema: z.ZodType): Tool {
  return {
    name,
    description,
    input_schema: z.toJSONSchema(schema) as Tool["input_schema"],
  };
}

// Shared "force a tool call, validate its input" flow behind every provider
// capability — the only difference between them is the prompt, the tool, and
// which schema validates the response.
async function callToolAndValidate<T>(
  client: AnthropicMessagesClient,
  args: { model: string; maxTokens: number; system: string; userMessage: string; tool: Tool },
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await client.messages.create({
    model: args.model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: "user", content: args.userMessage }],
    tools: [args.tool],
    tool_choice: { type: "tool", name: args.tool.name },
  });

  const toolUseBlock = findToolUseBlock(response);

  if (!toolUseBlock) {
    throw new AIResponseValidationError("Model did not return a tool_use block", []);
  }

  const result = schema.safeParse(toolUseBlock.input);

  if (!result.success) {
    throw new AIResponseValidationError("Response failed schema validation", result.error.issues);
  }

  return result.data;
}

export function createAnthropicProvider(client: AnthropicMessagesClient, model: string): AIProvider {
  return {
    async analyzeWriting(input: AnalyzeWritingInput) {
      return callToolAndValidate(
        client,
        {
          model,
          maxTokens: WRITING_ANALYSIS_MAX_TOKENS,
          system: buildWritingAnalysisSystemPrompt(),
          userMessage: buildWritingAnalysisUserMessage(input),
          tool: toTool(
            WRITING_ANALYSIS_TOOL_NAME,
            "Submit the structured analysis of the user's English writing.",
            writingAnalysisResultSchema,
          ),
        },
        writingAnalysisResultSchema,
      );
    },

    async generateExercises(targets: ExerciseTarget[]) {
      const result = await callToolAndValidate(
        client,
        {
          model,
          maxTokens: EXERCISE_GENERATION_MAX_TOKENS,
          system: buildExerciseGenerationSystemPrompt(),
          userMessage: buildExerciseGenerationUserMessage(targets),
          tool: toTool(
            EXERCISE_GENERATION_TOOL_NAME,
            "Submit the generated practice exercises, one per requested target.",
            exerciseGenerationResultSchema,
          ),
        },
        exerciseGenerationResultSchema,
      );

      if (result.exercises.length !== targets.length) {
        throw new AIResponseValidationError(
          `Expected ${targets.length} exercises, got ${result.exercises.length}`,
          [],
        );
      }

      const invalidMultipleChoice = result.exercises.find(
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

      return result.exercises;
    },

    async continueInterview(history: InterviewHistoryItem[]) {
      return callToolAndValidate(
        client,
        {
          model,
          maxTokens: INTERVIEW_QUESTION_MAX_TOKENS,
          system: buildInterviewSystemPrompt(),
          userMessage: buildInterviewUserMessage(history),
          tool: toTool(
            INTERVIEW_QUESTION_TOOL_NAME,
            "Submit the next interview question.",
            interviewQuestionResultSchema,
          ),
        },
        interviewQuestionResultSchema,
      );
    },
  };
}
