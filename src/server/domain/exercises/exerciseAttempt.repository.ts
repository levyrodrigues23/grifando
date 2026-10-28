import type { PrismaClient } from "@/generated/prisma/client";

export type CreateAttemptInput = {
  exerciseId: string;
  userAnswer: string;
  isCorrect: boolean;
  feedback: string;
};

export function createExerciseAttemptRepository(prisma: PrismaClient) {
  return {
    async create(input: CreateAttemptInput) {
      return prisma.exerciseAttempt.create({ data: input });
    },

    async countByUser(userId: string) {
      return prisma.exerciseAttempt.count({ where: { exercise: { userId } } });
    },

    // Timestamps only — the dashboard streak needs when, not what.
    async listAttemptDates(userId: string) {
      const rows = await prisma.exerciseAttempt.findMany({
        where: { exercise: { userId } },
        select: { attemptedAt: true },
      });
      return rows.map((row) => row.attemptedAt);
    },
  };
}

export type ExerciseAttemptRepository = ReturnType<typeof createExerciseAttemptRepository>;
