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

const WRITING_ANALYSIS_MAX_TOKENS = 4096;
const EXERCISE_GENERATION_MAX_TOKENS = 4096;
const INTERVIEW_QUESTION_MAX_TOKENS = 1024;
const ANSWER_EXPLANATION_MAX_TOKENS = 1024;

// The only part of the Gemini SDK this module depends on — keeps the
// provider trivially mockable in tests without a real API client (same
// reasoning as AnthropicMessagesClient in providers/anthropic.ts).
export type GeminiContentClient = {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: {
        systemInstruction?: string;
        maxOutputTokens?: number;
        responseMimeType?: string;
        responseJsonSchema?: unknown;
      };
    }): Promise<{ text: string | undefined }>;
  };
};

// @google/genai throws ApiError (with a numeric `status`); network failures
// and aborts are treated as the provider being unavailable.
function mapGeminiError(error: unknown): unknown {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number") {
    return accessErrorForStatus(status, error instanceof Error ? error.message : "") ?? error;
  }
  return error instanceof TypeError || (error instanceof Error && error.name === "AbortError")
    ? new AIProviderUnavailableError()
    : error;
}

// Gemini's native JSON mode (responseMimeType + responseJsonSchema) rather
// than function calling — simpler for "give me structured data back" than
// wrapping every capability as a tool call. Shared "call, parse, validate"
// flow, mirroring callToolAndValidate in providers/anthropic.ts.
async function generateStructured<T>(
  client: GeminiContentClient,
  args: {
    model: string;
    maxOutputTokens: number;
    systemInstruction: string;
    contents: string;
    jsonSchema: unknown;
  },
  schema: z.ZodType<T>,
): Promise<T> {
  let response: { text: string | undefined };
  try {
    response = await client.models.generateContent({
      model: args.model,
      contents: args.contents,
      config: {
        systemInstruction: args.systemInstruction,
        maxOutputTokens: args.maxOutputTokens,
        responseMimeType: "application/json",
        responseJsonSchema: args.jsonSchema,
      },
    });
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (!response.text) {
    throw new AIResponseValidationError("Model did not return any text", []);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new AIResponseValidationError("Model response was not valid JSON", []);
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new AIResponseValidationError("Response failed schema validation", result.error.issues);
  }

  return result.data;
}

// Key check for /settings: the smallest real request (one output token). Not
// an AIProvider capability — resolves when the key works, throws the same
// typed errors as the provider otherwise.
export async function testKey(client: GeminiContentClient, model: string): Promise<void> {
  try {
    await client.models.generateContent({ model, contents: "Hi", config: { maxOutputTokens: 1 } });
  } catch (error) {
    throw mapGeminiError(error);
  }
}

export function createGeminiProvider(client: GeminiContentClient, model: string): AIProvider {
  return {
    async analyzeWriting(input: AnalyzeWritingInput) {
      return generateStructured(
        client,
        {
          model,
          maxOutputTokens: WRITING_ANALYSIS_MAX_TOKENS,
          systemInstruction: buildWritingAnalysisSystemPrompt(),
          contents: buildWritingAnalysisUserMessage(input),
          jsonSchema: z.toJSONSchema(writingAnalysisResultSchema),
        },
        writingAnalysisResultSchema,
      );
    },

    async generateExercises(targets: ExerciseTarget[]) {
      const result = await generateStructured(
        client,
        {
          model,
          maxOutputTokens: EXERCISE_GENERATION_MAX_TOKENS,
          systemInstruction: buildExerciseGenerationSystemPrompt(),
          contents: buildExerciseGenerationUserMessage(targets),
          jsonSchema: z.toJSONSchema(exerciseGenerationResultSchema),
        },
        exerciseGenerationResultSchema,
      );

      return validateExerciseGenerationResult(result, targets.length);
    },

    async continueInterview(history: InterviewHistoryItem[]) {
      return generateStructured(
        client,
        {
          model,
          maxOutputTokens: INTERVIEW_QUESTION_MAX_TOKENS,
          systemInstruction: buildInterviewSystemPrompt(),
          contents: buildInterviewUserMessage(history),
          jsonSchema: z.toJSONSchema(interviewQuestionResultSchema),
        },
        interviewQuestionResultSchema,
      );
    },

    async explainAttempt(input: ExplainAttemptInput) {
      return generateStructured(
        client,
        {
          model,
          maxOutputTokens: ANSWER_EXPLANATION_MAX_TOKENS,
          systemInstruction: buildAnswerExplanationSystemPrompt(),
          contents: buildAnswerExplanationUserMessage(input),
          jsonSchema: z.toJSONSchema(answerExplanationResultSchema),
        },
        answerExplanationResultSchema,
      );
    },
  };
}
