import type { PrismaClient } from "@/generated/prisma/client";
import { isAIAccessError } from "@/server/ai/errors";
import type { AIProvider } from "@/server/ai/provider";
import { createMistakeOccurrenceRepository } from "@/server/domain/mistakes/mistakeOccurrence.repository";
import { applyExerciseResult } from "@/server/domain/mistakes/mastery";
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
  // The sessionId from a previous "failed" result. When it still names a FAILED
  // session of this user, that session is re-analyzed instead of creating a
  // duplicate (the resubmitted text replaces the old one).
  retrySessionId?: string;
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
      const { codeSnippet, retrySessionId, ...sessionInput } = input;
      const session =
        (retrySessionId && (await sessions.reopenFailed(retrySessionId, sessionInput))) ||
        (await sessions.create(sessionInput));

      let result;
      try {
        result = await aiProvider.analyzeWriting({
          text: input.originalText,
          promptType: input.promptType,
          promptText: input.promptText,
          technicalCategory: input.technicalCategory,
          codeSnippet,
        });
      } catch (error) {
        await sessions.markFailed(session.id);
        // Key/quota/availability problems are actionable by the visitor, so
        // they surface as typed errors; the text stays saved on the FAILED session.
        if (isAIAccessError(error)) throw error;
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
        technicalCommunicationScore: result.scores.technicalCommunication,
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

        // Making the mistake again is a failed recall: it costs mastery the
        // same way an incorrect exercise attempt does (SPEC.md §6).
        const demoted = applyExerciseResult(pattern, false);
        if (
          demoted.masteryLevel !== pattern.masteryLevel ||
          demoted.consecutiveCorrectCount !== pattern.consecutiveCorrectCount
        ) {
          await patterns.updateMastery(pattern.id, demoted);
        }

        await occurrences.create({
          analysisId: analysis!.id,
          patternId: pattern.id,
          originalSpan: mistake.originalSpan,
          correctedSpan: mistake.correctedSpan,
          category: mistake.category,
          severity: mistake.severity,
          explanation: mistake.explanation,
          example: mistake.example,
          l1Transfer: mistake.l1Transfer ?? false,
        });
      }

      const finalSession = await sessions.findById(session.id);
      return { status: "analyzed", session: finalSession! };
    },
  };
}

export type WritingCoachService = ReturnType<typeof createWritingCoachService>;
