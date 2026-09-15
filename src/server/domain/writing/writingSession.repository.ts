import type { PrismaClient } from "@/generated/prisma/client";
import type { PromptType, TechnicalCategory } from "@/generated/prisma/enums";

export type CreateWritingSessionInput = {
  userId: string;
  promptType: PromptType;
  originalText: string;
  promptText?: string;
  technicalCategory?: TechnicalCategory;
};

export function createWritingSessionRepository(prisma: PrismaClient) {
  return {
    async create(input: CreateWritingSessionInput) {
      return prisma.writingSession.create({ data: input });
    },

    async findById(id: string) {
      return prisma.writingSession.findUnique({
        where: { id },
        include: { analysis: { include: { occurrences: true } } },
      });
    },

    async listByUser(userId: string, options: { limit?: number } = {}) {
      return prisma.writingSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: options.limit,
      });
    },

    async markFailed(id: string) {
      return prisma.writingSession.update({
        where: { id },
        data: { status: "FAILED" },
      });
    },
  };
}

export type WritingSessionRepository = ReturnType<typeof createWritingSessionRepository>;
export type WritingSessionWithAnalysis = Awaited<ReturnType<WritingSessionRepository["findById"]>>;
