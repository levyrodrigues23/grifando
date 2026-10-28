import type { PrismaClient } from "@/generated/prisma/client";
import type { ExerciseType } from "@/generated/prisma/enums";
import type { GeneratedExercise } from "@/server/ai/schemas/exerciseGeneration";

export type CreateExerciseInput = {
  userId: string;
  type: ExerciseType;
  sourcePatternId?: string;
  promptData: GeneratedExercise;
  difficulty: number;
};

export function createExerciseRepository(prisma: PrismaClient) {
  return {
    async createMany(inputs: CreateExerciseInput[]) {
      return prisma.$transaction(
        inputs.map((input) =>
          prisma.exercise.create({
            data: { ...input, promptData: input.promptData },
          }),
        ),
      );
    },

    async findById(id: string) {
      return prisma.exercise.findUnique({
        where: { id },
        include: { attempts: { orderBy: { attemptedAt: "asc" } } },
      });
    },

    // "Pending" = never attempted yet — the practice queue shown to the user.
    async listPending(userId: string, options: { limit?: number } = {}) {
      return prisma.exercise.findMany({
        where: { userId, attempts: { none: {} } },
        orderBy: { createdAt: "asc" },
        take: options.limit,
      });
    },
  };
}

export type ExerciseRepository = ReturnType<typeof createExerciseRepository>;
