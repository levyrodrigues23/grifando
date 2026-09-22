import { z } from "zod";

export const interviewQuestionResultSchema = z.object({
  question: z.string().min(1).max(500),
});

export type InterviewQuestionResult = z.infer<typeof interviewQuestionResultSchema>;
