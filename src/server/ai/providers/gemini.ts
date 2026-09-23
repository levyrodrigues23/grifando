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
import {
  exerciseGenerationResultSchema,
  validateExerciseGenerationResult,
} from "@/server/ai/schemas/exerciseGeneration";
import { interviewQuestionResultSchema } from "@/server/ai/schemas/interview";
import { writingAnalysisResultSchema } from "@/server/ai/schemas/writingAnalysis";

const WRITING_ANALYSIS_MAX_TOKENS = 4096;
const EXERCISE_GENERATION_MAX_TOKENS = 4096;
const INTERVIEW_QUESTION_MAX_TOKENS = 1024;

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
  const response = await client.models.generateContent({
    model: args.model,
    contents: args.contents,
    config: {
      systemInstruction: args.systemInstruction,
      maxOutputTokens: args.maxOutputTokens,
      responseMimeType: "application/json",
      responseJsonSchema: args.jsonSchema,
    },
  });

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
  };
}
