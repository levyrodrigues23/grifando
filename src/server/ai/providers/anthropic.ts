import type Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming, Tool } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

import { AIProviderUnavailableError, AIResponseValidationError, accessErrorForStatus } from "@/server/ai/errors";
import {
  buildAnswerExplanationSystemPrompt,
  buildAnswerExplanationUserMessage,
  type ExplainAttemptInput,
} from "@/server/ai/prompts/answerExplanation";
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
import { answerExplanationResultSchema } from "@/server/ai/schemas/answerExplanation";
import {
  exerciseGenerationResultSchema,
  validateExerciseGenerationResult,
} from "@/server/ai/schemas/exerciseGeneration";
import { interviewQuestionResultSchema } from "@/server/ai/schemas/interview";
import { writingAnalysisResultSchema } from "@/server/ai/schemas/writingAnalysis";

const WRITING_ANALYSIS_TOOL_NAME = "submit_writing_analysis";
const WRITING_ANALYSIS_MAX_TOKENS = 4096;
const EXERCISE_GENERATION_TOOL_NAME = "submit_exercises";
const EXERCISE_GENERATION_MAX_TOKENS = 4096;
const INTERVIEW_QUESTION_TOOL_NAME = "submit_interview_question";
const INTERVIEW_QUESTION_MAX_TOKENS = 1024;
const ANSWER_EXPLANATION_MAX_TOKENS = 1024;
const ANSWER_EXPLANATION_TOOL_NAME = "submit_answer_explanation";

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

// AuthenticationError/PermissionDeniedError (401/403) -> rejected key,
// RateLimitError (429) -> quota, 5xx/529 and connection failures/timeouts ->
// unavailable. The SDK's APIError subclasses all carry a numeric `status`.
function mapAnthropicError(error: unknown): unknown {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") return accessErrorForStatus(status) ?? error;
  const name = error instanceof Error ? error.name : "";
  return name === "APIConnectionError" || name === "APIConnectionTimeoutError"
    ? new AIProviderUnavailableError()
    : error;
}

// Shared "force a tool call, validate its input" flow behind every provider
// capability — the only difference between them is the prompt, the tool, and
// which schema validates the response.
async function callToolAndValidate<T>(
  client: AnthropicMessagesClient,
  args: { model: string; maxTokens: number; system: string; userMessage: string; tool: Tool },
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Message;
  try {
    response = await client.messages.create({
      model: args.model,
      max_tokens: args.maxTokens,
      system: args.system,
      messages: [{ role: "user", content: args.userMessage }],
      tools: [args.tool],
      tool_choice: { type: "tool", name: args.tool.name },
    });
  } catch (error) {
    throw mapAnthropicError(error);
  }

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

// Key check for /settings: the smallest real request (one output token). Not
// an AIProvider capability — resolves when the key works, throws the same
// typed errors as the provider otherwise.
export async function testKey(client: AnthropicMessagesClient, model: string): Promise<void> {
  try {
    await client.messages.create({ model, max_tokens: 1, messages: [{ role: "user", content: "Hi" }] });
  } catch (error) {
    throw mapAnthropicError(error);
  }
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

      return validateExerciseGenerationResult(result, targets.length);
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

    async explainAttempt(input: ExplainAttemptInput) {
      return callToolAndValidate(
        client,
        {
          model,
          maxTokens: ANSWER_EXPLANATION_MAX_TOKENS,
          system: buildAnswerExplanationSystemPrompt(),
          userMessage: buildAnswerExplanationUserMessage(input),
          tool: toTool(
            ANSWER_EXPLANATION_TOOL_NAME,
            "Submit the explanation of the learner's answer.",
            answerExplanationResultSchema,
          ),
        },
        answerExplanationResultSchema,
      );
    },
  };
}
