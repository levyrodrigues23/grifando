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
  };
}

export type ExerciseAttemptRepository = ReturnType<typeof createExerciseAttemptRepository>;
