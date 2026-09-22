import type { PrismaClient } from "@/generated/prisma/client";

export function createInterviewRepository(prisma: PrismaClient) {
  return {
    async createSession(userId: string) {
      return prisma.interviewSession.create({ data: { userId } });
    },

    async findSessionById(id: string) {
      return prisma.interviewSession.findUnique({
        where: { id },
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

    async endSession(id: string) {
      return prisma.interviewSession.update({ where: { id }, data: { status: "ENDED" } });
    },
  };
}

export type InterviewRepository = ReturnType<typeof createInterviewRepository>;
