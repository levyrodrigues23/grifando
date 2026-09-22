import type { PrismaClient } from "@/generated/prisma/client";

export type CreateAnalysisInput = {
  sessionId: string;
  correctedText: string;
  naturalText: string;
  overallFeedback: string;
  grammarScore: number;
  vocabularyScore: number;
  clarityScore: number;
  naturalnessScore: number;
  technicalCommunicationScore?: number;
  modelId: string;
};

export function createWritingAnalysisRepository(prisma: PrismaClient) {
  return {
    // Writing an analysis always moves its session out of PENDING; keeping both
    // writes in one transaction avoids a session stuck ANALYZED with no analysis row.
    async createForSession(input: CreateAnalysisInput) {
      const { sessionId, ...data } = input;

      return prisma.$transaction(async (tx) => {
        const analysis = await tx.writingAnalysis.create({
          data: { sessionId, ...data },
        });

        await tx.writingSession.update({
          where: { id: sessionId },
          data: { status: "ANALYZED" },
        });

        return analysis;
      });
    },

    async findBySessionId(sessionId: string) {
      return prisma.writingAnalysis.findUnique({
        where: { sessionId },
        include: { occurrences: true },
      });
    },
  };
}

export type WritingAnalysisRepository = ReturnType<typeof createWritingAnalysisRepository>;
