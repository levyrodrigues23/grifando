import type { PrismaClient } from "@/generated/prisma/client";

export function createInterviewRepository(prisma: PrismaClient) {
  return {
    async createSession(userId: string) {
      return prisma.interviewSession.create({ data: { userId } });
    },

    async findSessionById(id: string, userId: string) {
      return prisma.interviewSession.findFirst({
        where: { id, userId },
        include: {
          turns: {
            orderBy: { order: "asc" },
            include: { writingAnalysis: true },
          },
        },
      });
    },

    async createTurn(input: { interviewSessionId: string; question: string; order: number }) {
      return prisma.interviewTurn.create({ data: input });
    },

    async answerTurn(turnId: string, input: { userAnswer: string; writingAnalysisId: string }) {
      return prisma.interviewTurn.update({ where: { id: turnId }, data: input });
    },

    // Returns false when the session doesn't exist or isn't the user's.
    async endSession(id: string, userId: string) {
      const { count } = await prisma.interviewSession.updateMany({
        where: { id, userId },
        data: { status: "ENDED" },
      });
      return count > 0;
    },
  };
}

export type InterviewRepository = ReturnType<typeof createInterviewRepository>;
