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

    async countAnalyzed(userId: string) {
      return prisma.writingSession.count({ where: { userId, status: "ANALYZED" } });
    },

    // Timestamps only — the dashboard streak needs when, not what.
    async listAnalyzedDates(userId: string) {
      const rows = await prisma.writingSession.findMany({
        where: { userId, status: "ANALYZED" },
        select: { createdAt: true },
      });
      return rows.map((row) => row.createdAt);
    },

    // Includes the analysis scores directly — used for the dashboard's
    // "recent writing" list and score trend, not just the session metadata.
    async listRecentAnalyzed(userId: string, options: { limit?: number } = {}) {
      return prisma.writingSession.findMany({
        where: { userId, status: "ANALYZED" },
        orderBy: { createdAt: "desc" },
        take: options.limit,
        include: { analysis: true },
      });
    },

    // Reopens a FAILED session for another analysis attempt, overwriting its
    // content with what the user resubmitted (they may have edited the text).
    // Returns null when the session doesn't exist, belongs to someone else, or
    // isn't FAILED — the caller then creates a fresh session instead.
    async reopenFailed(id: string, input: CreateWritingSessionInput) {
      const { count } = await prisma.writingSession.updateMany({
        where: { id, userId: input.userId, status: "FAILED" },
        data: {
          promptType: input.promptType,
          originalText: input.originalText,
          promptText: input.promptText ?? null,
          technicalCategory: input.technicalCategory ?? null,
          status: "PENDING",
        },
      });
      return count === 1 ? prisma.writingSession.findUniqueOrThrow({ where: { id } }) : null;
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
