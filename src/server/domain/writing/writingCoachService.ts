import type { PrismaClient } from "@/generated/prisma/client";
import type { AIProvider } from "@/server/ai/provider";
import { createMistakeOccurrenceRepository } from "@/server/domain/mistakes/mistakeOccurrence.repository";
import { createMistakePatternRepository } from "@/server/domain/mistakes/mistakePattern.repository";
import { createWritingAnalysisRepository } from "@/server/domain/writing/writingAnalysis.repository";
import {
  createWritingSessionRepository,
  type CreateWritingSessionInput,
  type WritingSessionWithAnalysis,
} from "@/server/domain/writing/writingSession.repository";

export type SubmitWritingInput = CreateWritingSessionInput & {
  // EXPLAIN_CODE only — passed to the AI for context, never persisted (see
  // AnalyzeWritingInput.codeSnippet and SPEC.md §5.6).
  codeSnippet?: string;
};

export type SubmitWritingResult =
  | { status: "analyzed"; session: NonNullable<WritingSessionWithAnalysis> }
  | { status: "failed"; sessionId: string; message: string };

const ANALYSIS_FAILURE_MESSAGE =
  "We couldn't analyze this writing right now. Your text has not been lost — you can try again.";

export function createWritingCoachService(deps: {
  prisma: PrismaClient;
  aiProvider: AIProvider;
  modelId: string;
}) {
  const { prisma, aiProvider, modelId } = deps;
  const sessions = createWritingSessionRepository(prisma);
  const analyses = createWritingAnalysisRepository(prisma);
  const patterns = createMistakePatternRepository(prisma);
  const occurrences = createMistakeOccurrenceRepository(prisma);

  return {
    // Orchestrates one Writing Coach submission end to end: persist the raw
    // text first (so it's never lost), call the AI, and only then write the
    // analysis + mistake breakdown. An AI failure leaves the session FAILED
    // with the original text intact instead of a partial/corrupt record.
    async submitWriting(input: SubmitWritingInput): Promise<SubmitWritingResult> {
      const { codeSnippet, ...sessionInput } = input;
      const session = await sessions.create(sessionInput);

      let result;
      try {
        result = await aiProvider.analyzeWriting({
          text: input.originalText,
          promptType: input.promptType,
          promptText: input.promptText,
          technicalCategory: input.technicalCategory,
          codeSnippet,
        });
      } catch {
        await sessions.markFailed(session.id);
        return { status: "failed", sessionId: session.id, message: ANALYSIS_FAILURE_MESSAGE };
      }

      await analyses.createForSession({
        sessionId: session.id,
        correctedText: result.correctedText,
        naturalText: result.naturalText,
        overallFeedback: result.overallFeedback,
        grammarScore: result.scores.grammar,
        vocabularyScore: result.scores.vocabulary,
        clarityScore: result.scores.clarity,
        naturalnessScore: result.scores.naturalness,
        modelId,
      });

      const analysis = await analyses.findBySessionId(session.id);

      for (const mistake of result.mistakes) {
        const pattern = await patterns.upsertPattern({
          userId: input.userId,
          category: mistake.category,
          rawPatternKey: mistake.patternKey,
          exampleOriginal: mistake.originalSpan,
          exampleCorrection: mistake.correctedSpan,
        });

        await occurrences.create({
          analysisId: analysis!.id,
          patternId: pattern.id,
          originalSpan: mistake.originalSpan,
          correctedSpan: mistake.correctedSpan,
          category: mistake.category,
          severity: mistake.severity,
          explanation: mistake.explanation,
          example: mistake.example,
        });
      }

      const finalSession = await sessions.findById(session.id);
      return { status: "analyzed", session: finalSession! };
    },
  };
}

export type WritingCoachService = ReturnType<typeof createWritingCoachService>;
