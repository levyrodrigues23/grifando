import { z } from "zod";

import { MistakeCategory, MistakeSeverity } from "@/generated/prisma/enums";

const scoreSchema = z.number().int().min(0).max(100);

export const mistakeResultSchema = z.object({
  originalSpan: z.string().min(1).max(500),
  correctedSpan: z.string().min(1).max(500),
  category: z.nativeEnum(MistakeCategory),
  severity: z.nativeEnum(MistakeSeverity),
  explanation: z.string().min(1).max(1000),
  example: z.string().min(1).max(500),
  // Short, model-proposed slug identifying the underlying grammatical concept —
  // normalized and used for MistakePattern dedup (SPEC.md §6).
  patternKey: z.string().min(1).max(80),
});

export const writingAnalysisResultSchema = z.object({
  correctedText: z.string().min(1).max(10000),
  naturalText: z.string().min(1).max(10000),
  overallFeedback: z.string().min(1).max(2000),
  scores: z.object({
    grammar: scoreSchema,
    vocabulary: scoreSchema,
    clarity: scoreSchema,
    naturalness: scoreSchema,
    // INTERVIEW mode only — a fifth dimension for how clearly the candidate
    // communicated technical ideas (SPEC.md §5.8). Omitted for every other
    // writing mode.
    technicalCommunication: scoreSchema.optional(),
  }),
  mistakes: z.array(mistakeResultSchema).max(50),
});

export type MistakeResult = z.infer<typeof mistakeResultSchema>;
export type WritingAnalysisResult = z.infer<typeof writingAnalysisResultSchema>;
