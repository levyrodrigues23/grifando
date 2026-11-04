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

    // Scoped to the exercise and its owner so an id from another user (or a
    // mismatched exercise) reads as not found.
    async findForUser(input: { attemptId: string; exerciseId: string; userId: string }) {
      return prisma.exerciseAttempt.findFirst({
        where: { id: input.attemptId, exerciseId: input.exerciseId, exercise: { userId: input.userId } },
        include: { exercise: true },
      });
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
