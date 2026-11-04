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

    // Share of the latest attempts answered correctly, for checking that
    // difficulty targeting lands near its ~70% goal. Null with no attempts.
    async recentAccuracy(userId: string, options: { limit: number }) {
      const recent = await prisma.exerciseAttempt.findMany({
        where: { exercise: { userId } },
        orderBy: { attemptedAt: "desc" },
        take: options.limit,
        select: { isCorrect: true },
      });
      if (recent.length === 0) return null;
      const correct = recent.filter((attempt) => attempt.isCorrect).length;
      return { correct, total: recent.length };
    },
  };
}

export type ExerciseAttemptRepository = ReturnType<typeof createExerciseAttemptRepository>;
