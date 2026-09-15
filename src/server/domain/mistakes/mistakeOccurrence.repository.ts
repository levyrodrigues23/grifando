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

    async countByCategory(userId: string, options: { since?: Date } = {}) {
      const grouped = await prisma.mistakeOccurrence.groupBy({
        by: ["category"],
        where: {
          pattern: { userId },
          ...(options.since ? { createdAt: { gte: options.since } } : {}),
        },
        _count: { _all: true },
      });

      return grouped.map((row) => ({ category: row.category, count: row._count._all }));
    },
  };
}

export type MistakeOccurrenceRepository = ReturnType<typeof createMistakeOccurrenceRepository>;
