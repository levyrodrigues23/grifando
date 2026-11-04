import type { PrismaClient } from "@/generated/prisma/client";

export type CreateVocabularyItemInput = {
  userId: string;
  term: string;
  meaningPt: string;
  exampleSentence: string;
  sourceSessionId?: string;
};

export function createVocabularyRepository(prisma: PrismaClient) {
  return {
    // A sourceSessionId that isn't one of the user's own sessions is dropped
    // rather than trusted: the link is a convenience, never an authorization.
    async create(input: CreateVocabularyItemInput) {
      const { sourceSessionId, ...data } = input;
      const ownsSession =
        sourceSessionId !== undefined &&
        (await prisma.writingSession.count({ where: { id: sourceSessionId, userId: input.userId } })) > 0;

      return prisma.vocabularyItem.create({
        data: { ...data, sourceSessionId: ownsSession ? sourceSessionId : null },
      });
    },

    async listByUser(userId: string) {
      return prisma.vocabularyItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    },

    // Returns false when the item doesn't exist or belongs to someone else.
    async delete(id: string, userId: string) {
      const { count } = await prisma.vocabularyItem.deleteMany({ where: { id, userId } });
      return count === 1;
    },
  };
}

export type VocabularyRepository = ReturnType<typeof createVocabularyRepository>;
