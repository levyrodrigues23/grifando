import { z } from "zod";

export const answerExplanationResultSchema = z.object({
  explanation: z.string().min(1).max(1500),
});

export type AnswerExplanationResult = z.infer<typeof answerExplanationResultSchema>;
