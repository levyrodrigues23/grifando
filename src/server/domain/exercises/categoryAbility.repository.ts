import type { PrismaClient } from "@/generated/prisma/client";
import type { MistakeCategory } from "@/generated/prisma/enums";

export function createCategoryAbilityRepository(prisma: PrismaClient) {
  return {
    // Ratings by category; categories never practiced are absent (callers use
    // DEFAULT_ABILITY).
    async getRatings(userId: string): Promise<Map<MistakeCategory, number>> {
      const rows = await prisma.categoryAbility.findMany({ where: { userId } });
      return new Map(rows.map((row) => [row.category, row.rating]));
    },

    async setRating(userId: string, category: MistakeCategory, rating: number) {
      return prisma.categoryAbility.upsert({
        where: { userId_category: { userId, category } },
        create: { userId, category, rating, attemptCount: 1 },
        update: { rating, attemptCount: { increment: 1 } },
      });
    },
  };
}
