import type { AnalyzeWritingInput } from "@/server/ai/prompts/writingAnalysis";
import type { WritingAnalysisResult } from "@/server/ai/schemas/writingAnalysis";

// Small, capability-scoped interface so the AI provider is swappable. Add a
// method here only when a feature phase actually needs it (see CLAUDE.md).
export interface AIProvider {
  analyzeWriting(input: AnalyzeWritingInput): Promise<WritingAnalysisResult>;
}
