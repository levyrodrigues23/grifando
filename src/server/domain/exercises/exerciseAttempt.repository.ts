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
  };
}

export type ExerciseAttemptRepository = ReturnType<typeof createExerciseAttemptRepository>;
