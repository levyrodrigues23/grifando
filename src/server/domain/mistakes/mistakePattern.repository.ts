import type { PrismaClient } from "@/generated/prisma/client";
import type { MasteryLevel, MistakeCategory } from "@/generated/prisma/enums";
import { normalizePatternKey } from "@/server/domain/mistakes/patternKey";

export type UpsertPatternInput = {
  userId: string;
  category: MistakeCategory;
  rawPatternKey: string;
  exampleOriginal: string;
  exampleCorrection: string;
};

export function createMistakePatternRepository(prisma: PrismaClient) {
  return {
    // Collapses repeated occurrences of the same concept into one growing
    // pattern instead of one row per occurrence (SPEC.md §6). Making the same
    // mistake again in writing is a failed recall, so it also feeds the
    // half-life counters (recall.ts).
    async upsertPattern(input: UpsertPatternInput) {
      const patternKey = normalizePatternKey(input.rawPatternKey);
      const now = new Date();

      return prisma.mistakePattern.upsert({
        where: {
          userId_category_patternKey: {
            userId: input.userId,
            category: input.category,
            patternKey,
          },
        },
        create: {
          userId: input.userId,
          category: input.category,
          patternKey,
          exampleOriginal: input.exampleOriginal,
          exampleCorrection: input.exampleCorrection,
          occurrenceCount: 1,
          incorrectCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          lastPracticedAt: now,
        },
        update: {
          occurrenceCount: { increment: 1 },
          incorrectCount: { increment: 1 },
          lastSeenAt: now,
          lastPracticedAt: now,
          exampleOriginal: input.exampleOriginal,
          exampleCorrection: input.exampleCorrection,
        },
      });
    },

    async listByUser(userId: string) {
      return prisma.mistakePattern.findMany({
        where: { userId },
        orderBy: [{ occurrenceCount: "desc" }, { lastSeenAt: "desc" }],
      });
    },

    async findById(id: string) {
      return prisma.mistakePattern.findUnique({ where: { id } });
    },

    // Recency order (vs. listByUser's frequency order) — for a dashboard's
    // "recent mistakes" glance rather than the Mistake Notebook's full list.
    async listRecentByUser(userId: string, options: { limit?: number } = {}) {
      return prisma.mistakePattern.findMany({
        where: { userId },
        orderBy: { lastSeenAt: "desc" },
        take: options.limit,
      });
    },

    async updateMastery(
      id: string,
      data: { masteryLevel: MasteryLevel; consecutiveCorrectCount: number },
    ) {
      return prisma.mistakePattern.update({ where: { id }, data });
    },

    // One exercise attempt on the pattern: the new mastery state plus a recall
    // event for the half-life counters.
    async recordAttempt(
      id: string,
      data: { masteryLevel: MasteryLevel; consecutiveCorrectCount: number; isCorrect: boolean },
    ) {
      const { isCorrect, ...mastery } = data;
      return prisma.mistakePattern.update({
        where: { id },
        data: {
          ...mastery,
          ...(isCorrect ? { correctCount: { increment: 1 } } : { incorrectCount: { increment: 1 } }),
          lastPracticedAt: new Date(),
        },
      });
    },
  };
}

export type MistakePatternRepository = ReturnType<typeof createMistakePatternRepository>;
