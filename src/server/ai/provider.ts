import type { ExerciseTarget } from "@/server/ai/prompts/exerciseGeneration";
import type { InterviewHistoryItem } from "@/server/ai/prompts/interview";
import type { AnalyzeWritingInput } from "@/server/ai/prompts/writingAnalysis";
import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";
import type { InterviewQuestionResult } from "@/server/ai/schemas/interview";
import type { WritingAnalysisResult } from "@/server/ai/schemas/writingAnalysis";

// Small, capability-scoped interface so the AI provider is swappable. Add a
// method here only when a feature phase actually needs it (see CLAUDE.md).
export interface AIProvider {
  analyzeWriting(input: AnalyzeWritingInput): Promise<WritingAnalysisResult>;
  generateExercises(targets: ExerciseTarget[]): Promise<GeneratedExercise[]>;
  continueInterview(history: InterviewHistoryItem[]): Promise<InterviewQuestionResult>;
}
