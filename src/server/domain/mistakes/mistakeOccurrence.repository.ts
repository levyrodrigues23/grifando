import type { PrismaClient } from "@/generated/prisma/client";
import type { MistakeCategory, MistakeSeverity } from "@/generated/prisma/enums";

export type CreateOccurrenceInput = {
  analysisId: string;
  patternId: string;
  originalSpan: string;
  correctedSpan: string;
  category: MistakeCategory;
  severity: MistakeSeverity;
  explanation: string;
  example: string;
};

export function createMistakeOccurrenceRepository(prisma: PrismaClient) {
  return {
    async create(input: CreateOccurrenceInput) {
      return prisma.mistakeOccurrence.create({ data: input });
    },

    async listByAnalysis(analysisId: string) {
      return prisma.mistakeOccurrence.findMany({
        where: { analysisId },
        orderBy: { createdAt: "asc" },
      });
    },
  };
}

export type MistakeOccurrenceRepository = ReturnType<typeof createMistakeOccurrenceRepository>;
